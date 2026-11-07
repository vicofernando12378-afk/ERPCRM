<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class LegacyMasters extends Command
{
    protected $signature = 'erp:legacy-masters {--source=legacy_demo} {--apply : Importar solo maestros, sin stock ni documentos}';
    protected $description = 'Importación repetible de catálogos legacy, sin contraseñas ni existencias artificiales';
    private string $source;

    private function mapped(string $table, mixed $id): ?int
    {
        return DB::table('legacy_mappings')->where(['source' => $this->source, 'source_table' => $table, 'legacy_id' => (string) $id])->value('target_id');
    }
    private function insert(string $oldTable, mixed $oldId, string $target, array $values): int
    {
        if ($id = $this->mapped($oldTable, $oldId)) return $id;
        $id = DB::table($target)->insertGetId($values + ['created_at' => now(), 'updated_at' => now()]);
        DB::table('legacy_mappings')->insert(['source' => $this->source, 'source_table' => $oldTable, 'legacy_id' => (string) $oldId, 'target_table' => $target, 'target_id' => $id, 'created_at' => now(), 'updated_at' => now()]);
        return $id;
    }
    public function handle(): int
    {
        $this->source = $this->option('source');
        if (! app()->environment('local', 'testing') || ! preg_match('/^[a-zA-Z0-9_]+$/', $this->source) || $this->source === config('database.connections.mysql.database')) {
            $this->error('Solo se admite una base de origen distinta en entorno local/testing.'); return self::FAILURE;
        }
        $this->call('erp:legacy-audit', ['--source' => $this->source]);
        if (! $this->option('apply')) { $this->info('Solo diagnóstico. Usa --apply para importar maestros sin stock ni documentos.'); return self::SUCCESS; }
        $db = DB::connection('legacy_audit');
        DB::transaction(function () use ($db) {
            // Source-prefixed names avoid merging unrelated records with matching labels.
            foreach ($db->table('item_unit')->get() as $r) $this->insert('item_unit', $r->id, 'units', ['name' => $r->name.' [legacy '.$r->id.']', 'active' => ! $r->inactive]);
            foreach ($db->table('stock_category')->get() as $r) $this->insert('stock_category', $r->category_id, 'categories', ['name' => $r->description.' [legacy '.$r->category_id.']', 'active' => ! $r->inactive]);
            foreach ($db->table('item_tax_types')->get() as $r) $this->insert('item_tax_types', $r->id, 'taxes', ['name' => $r->name.' [legacy '.$r->id.']', 'rate' => $r->tax_rate, 'active' => true]);
            foreach ($db->table('sales_types')->get() as $r) $this->insert('sales_types', $r->id, 'price_lists', ['name' => $r->sales_type.' [legacy '.$r->id.']', 'active' => true]);
            foreach ($db->table('location')->get() as $r) $this->insert('location', $r->loc_code, 'locations', ['code' => $r->loc_code, 'name' => $r->location_name, 'email' => $r->email ?: null, 'phone' => $r->phone ?: null, 'address' => $r->delivery_address, 'active' => ! $r->inactive]);
            foreach ($db->table('debtors_master')->get() as $r) $this->insert('debtors_master', $r->debtor_no, 'customers', ['name' => $r->name, 'email' => $r->email ?: null, 'phone' => $r->phone ?: null, 'address' => $r->address, 'tax_id' => $r->vat_no ?: null, 'active' => ! $r->inactive]);
            foreach ($db->table('suppliers')->get() as $r) $this->insert('suppliers', $r->supplier_id, 'suppliers', ['name' => $r->supp_name, 'email' => $r->email ?: null, 'address' => trim($r->address.' '.$r->city.' '.$r->state), 'active' => ! $r->inactive]);
            foreach ($db->table('cust_branch')->get() as $r) {
                $customer = $this->mapped('debtors_master', $r->debtor_no);
                if (! $customer) throw new RuntimeException('Sucursal con cliente inexistente: '.$r->branch_code);
                $this->insert('cust_branch', $r->branch_code, 'branches', ['name' => $r->br_name, 'customer_id' => $customer, 'contact' => $r->br_contact, 'billing_address' => trim($r->billing_street.' '.$r->billing_city.' '.$r->billing_state.' '.$r->billing_zip_code), 'shipping_address' => trim($r->shipping_street.' '.$r->shipping_city.' '.$r->shipping_state.' '.$r->shipping_zip_code), 'active' => true]);
            }
            foreach ($db->table('stock_master')->get() as $r) {
                $unit = $db->table('item_unit')->where('abbr', $r->units)->orWhere('name', $r->units)->first();
                if (! $unit && ctype_digit((string) $r->units)) $unit = $db->table('item_unit')->where('id', $r->units)->first();
                if (! $unit) throw new RuntimeException('Unidad sin equivalencia para SKU '.$r->stock_id.': '.$r->units);
                $purchase = $db->table('purchase_prices')->where('stock_id', $r->stock_id)->orderBy('id')->first();
                $sale = $db->table('sale_prices')->where('stock_id', $r->stock_id)->orderBy('id')->first();
                $this->insert('stock_master', $r->stock_id, 'items', ['sku' => (string) $r->stock_id, 'name' => $r->description, 'description' => $r->long_description, 'unit_id' => $this->mapped('item_unit', $unit->id), 'category_id' => $this->mapped('stock_category', $r->category_id), 'tax_id' => $this->mapped('item_tax_types', $r->tax_type_id), 'purchase_price' => $purchase->price ?? 0, 'sale_price' => $sale->price ?? 0, 'min_stock' => 0, 'active' => ! $r->inactive && ! $r->deleted_status]);
            }
            foreach ($db->table('sale_prices')->get() as $r) {
                $item = $this->mapped('stock_master', $r->stock_id); $list = $this->mapped('sales_types', $r->sales_type_id);
                if (! $item || ! $list || strlen($r->curr_abrev) !== 3) throw new RuntimeException('Precio sin equivalencia válida: '.$r->id);
                $this->insert('sale_prices', $r->id, 'prices', ['item_id' => $item, 'price_list_id' => $list, 'currency' => $r->curr_abrev, 'price' => $r->price]);
            }
        });
        $this->info('Maestros importados con equivalencias. No se importaron stock, documentos, usuarios ni credenciales. Repetir no duplica registros.');
        return self::SUCCESS;
    }
}
