<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\{DB, File};

class LegacyAudit extends Command
{
    protected $signature = 'erp:legacy-audit {--source=legacy_demo : Base restaurada, solo lectura}';
    protected $description = 'Auditar datos de prueba de StockPile sin modificar el ERP ni inventar existencias';

    public function handle(): int
    {
        $source = $this->option('source');
        if (! preg_match('/^[a-zA-Z0-9_]+$/', $source) || $source === config('database.connections.mysql.database')) { $this->error('Base de origen inválida.'); return self::FAILURE; }
        config(['database.connections.legacy_audit' => array_replace(config('database.connections.mysql'), ['database' => $source])]);
        DB::purge('legacy_audit'); $db = DB::connection('legacy_audit');
        $tables = ['stock_master', 'item_code', 'stock_category', 'item_unit', 'item_tax_types', 'sale_prices', 'sales_types', 'purchase_prices', 'location', 'stock_moves', 'stock_transfer', 'debtors_master', 'cust_branch', 'suppliers', 'purch_orders', 'purch_order_details', 'receive_orders', 'receive_order_details', 'sales_orders', 'sales_order_details', 'payment_history', 'payment_terms', 'invoice_payment_terms', 'shipment', 'shipment_details'];
        $report = ['source' => $source, 'generated_at' => now()->toIso8601String(), 'mode' => 'read_only', 'counts' => [], 'checks' => []];
        foreach ($tables as $table) $report['counts'][$table] = $db->table($table)->count();
        $report['checks']['unknown_stock_items'] = $db->table('stock_moves as m')->leftJoin('stock_master as i', 'i.stock_id', '=', 'm.stock_id')->whereNull('i.stock_id')->count();
        $report['checks']['unknown_stock_locations'] = $db->table('stock_moves as m')->leftJoin('location as l', 'l.loc_code', '=', 'm.loc_code')->whereNull('l.loc_code')->count();
        $report['checks']['orphan_sales_lines'] = $db->table('sales_order_details as l')->leftJoin('sales_orders as d', 'd.order_no', '=', 'l.order_no')->whereNull('d.order_no')->count();
        $report['checks']['negative_balances'] = $db->table('stock_moves')->selectRaw('stock_id, loc_code, SUM(qty) as balance')->groupBy('stock_id', 'loc_code')->havingRaw('SUM(qty) < 0')->get()->all();
        $report['checks']['invoice_payment_differences'] = $db->select('SELECT d.order_no, d.reference, d.paid_amount AS recorded, COALESCE(p.total,0) AS receipts FROM sales_orders d LEFT JOIN (SELECT invoice_reference, SUM(amount) total FROM payment_history GROUP BY invoice_reference) p ON p.invoice_reference=d.reference WHERE d.trans_type=202 AND ABS(d.paid_amount-COALESCE(p.total,0)) > 0.005');
        $report['checks']['invoice_without_stock_movement'] = $db->table('sales_orders as d')->where('d.trans_type', 202)->whereNotExists(function ($q) { $q->selectRaw('1')->from('stock_moves as m')->whereColumn('m.transaction_reference_id', 'd.order_no')->where('m.trans_type', 202); })->count();
        $report['stock_from_ledger'] = $db->table('stock_moves')->selectRaw('stock_id, loc_code, SUM(qty) as quantity')->groupBy('stock_id', 'loc_code')->get()->all();
        $path = storage_path('app/private/legacy-audit.json'); File::ensureDirectoryExists(dirname($path));
        File::put($path, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $this->table(['Tabla', 'Registros'], array_map(fn ($table, $count) => [$table, $count], array_keys($report['counts']), $report['counts']));
        $this->info('Informe de solo lectura: '.$path);
        return self::SUCCESS;
    }
}
