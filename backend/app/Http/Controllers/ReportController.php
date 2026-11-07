<?php

namespace App\Http\Controllers;

use App\Domain\Access;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function dashboard(Request $r)
    {
        $q = DB::table('documents')->where('status', '!=', 'cancelled');
        if ($r->user()->role === 'customer') $q->where('customer_id', $r->user()->customer_id ?? 0);
        $totals = (clone $q)->where('type', 'invoice')->selectRaw('currency, SUM(total) as total, SUM(paid) as paid, SUM(total-paid) as balance')->groupBy('currency')->get();
        return ['orders' => (clone $q)->where('type', 'order')->count(), 'invoices' => (clone $q)->where('type', 'invoice')->count(), 'shipments_pending' => (clone $q)->where(['type' => 'shipment', 'status' => 'packed'])->count(), 'items' => $r->user()->role === 'customer' ? null : DB::table('items')->where('active', true)->count(), 'totals' => $totals, 'recent' => $q->orderByDesc('id')->limit(8)->get()];
    }
    private function salesQuery(Request $r)
    {
        Access::require($r->user(), 'reports');
        $r->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d|after_or_equal:from']);
        return DB::table('documents')->where(['type' => 'invoice'])->where('status', '!=', 'cancelled')->when($r->from, fn ($q) => $q->where('date', '>=', $r->from))->when($r->to, fn ($q) => $q->where('date', '<=', $r->to));
    }
    public function sales(Request $r)
    {
        $q = $this->salesQuery($r);
        return ['totals' => (clone $q)->selectRaw('currency, COUNT(*) as documents, SUM(subtotal) as subtotal, SUM(tax_total) as taxes, SUM(total) as total, SUM(total-paid) as balance')->groupBy('currency')->get(), 'rows' => $q->orderByDesc('id')->paginate(20)];
    }
    private function inventoryQuery(Request $r)
    {
        Access::require($r->user(), 'reports');
        return DB::table('stock_balances as b')->join('items as i', 'i.id', '=', 'b.item_id')->join('locations as l', 'l.id', '=', 'b.location_id')->select('b.id', 'i.sku', 'i.name', 'l.name as location', 'b.quantity', 'i.purchase_price', 'i.sale_price')->selectRaw('ROUND(b.quantity*i.purchase_price,2) as reference_cost, ROUND(b.quantity*i.sale_price,2) as reference_sale_value');
    }
    public function inventory(Request $r) { return $this->inventoryQuery($r)->orderBy('b.id')->paginate(20); }
    public function export(Request $r, string $type)
    {
        abort_unless(in_array($type, ['sales', 'inventory']), 404);
        $q = $type === 'sales' ? $this->salesQuery($r)->select('id', 'number', 'date', 'currency', 'subtotal', 'tax_total', 'total', 'paid')->orderBy('id') : $this->inventoryQuery($r)->orderBy('b.id');
        return response()->streamDownload(function () use ($q) {
            $stream = fopen('php://output', 'w'); fwrite($stream, "\xEF\xBB\xBF"); $header = false;
            foreach ($q->lazy(500) as $row) {
                $row = (array) $row;
                if (! $header) { fputcsv($stream, array_keys($row), ',', '"', ''); $header = true; }
                $values = array_map(fn ($v) => is_string($v) && preg_match('/^[=+@\-\t\r]/', $v) ? "'".$v : $v, $row);
                fputcsv($stream, $values, ',', '"', '');
            }
            fclose($stream);
        }, $type.'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
