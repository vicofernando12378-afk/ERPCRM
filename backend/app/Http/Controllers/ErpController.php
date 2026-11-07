<?php

namespace App\Http\Controllers;

use App\Domain\{Access, Decimal, Documents, Inventory, Operations};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ErpController extends Controller
{
    private function active(string $table): mixed { return Rule::exists($table, 'id')->where('active', true); }
    private function run(Request $r, string $action, array $data, callable $fn): array
    {
        return Operations::run($r->user()->id, (string) $r->header('Idempotency-Key'), $action, $data, $fn);
    }

    public function list(Request $r, string $type)
    {
        abort_unless(in_array($type, ['purchase', 'receipt', 'order', 'invoice', 'shipment']), 404);
        $filters = $r->validate(['q' => 'nullable|string|max:100', 'from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d', 'page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);
        $q = DB::table('documents')->where('type', $type);
        if ($r->user()->role === 'customer') { abort_if(in_array($type, ['purchase', 'receipt']), 403); $q->where('customer_id', $r->user()->customer_id ?? 0); }
        if (! empty($filters['q'])) $q->where('number', 'like', '%'.$filters['q'].'%');
        if (! empty($filters['from'])) $q->where('date', '>=', $filters['from']);
        if (! empty($filters['to'])) $q->where('date', '<=', $filters['to']);
        return $q->orderByDesc('id')->paginate($filters['per_page'] ?? 20);
    }

    public function detail(Request $r, int $id)
    {
        $doc = Documents::detail($id);
        if ($r->user()->role === 'customer') abort_unless($doc['customer_id'] && $doc['customer_id'] === $r->user()->customer_id, 403);
        return $doc;
    }

    public function create(Request $r, string $type)
    {
        abort_unless(in_array($type, ['order', 'purchase', 'direct-sale']), 404);
        Access::require($r->user(), $type === 'purchase' ? 'purchase.write' : 'sales.write');
        if ($type === 'direct-sale') Access::require($r->user(), 'invoice.write');
        $data = $r->validate([
            'customer_id' => [$type !== 'purchase' ? 'required' : 'prohibited', $this->active('customers')],
            'supplier_id' => [$type === 'purchase' ? 'required' : 'prohibited', $this->active('suppliers')],
            'branch_id' => ['nullable', $this->active('branches')], 'location_id' => ['required', $this->active('locations')],
            'date' => 'required|date_format:Y-m-d', 'due_date' => 'nullable|date_format:Y-m-d|after_or_equal:date', 'currency' => 'required|in:PEN,USD,EUR', 'notes' => 'nullable|string|max:5000',
            'lines' => 'required|array|min:1|max:100', 'lines.*' => 'array:item_id,quantity,unit_price,discount_percent,tax_percent', 'lines.*.item_id' => ['required', 'integer', 'distinct', $this->active('items')],
            'lines.*.quantity' => 'required|numeric|gt:0|max:1000000|decimal:0,3', 'lines.*.unit_price' => 'required|numeric|min:0|max:1000000|decimal:0,2',
            'lines.*.discount_percent' => 'sometimes|numeric|min:0|max:100|decimal:0,2', 'lines.*.tax_percent' => 'sometimes|numeric|min:0|max:100|decimal:0,2',
        ]);
        return $this->run($r, 'create:'.$type, $data, function () use ($r, $type, $data) {
            $doc = Documents::create($type === 'direct-sale' ? 'order' : $type, $data, $r->user()->id);
            if ($type !== 'direct-sale') return $doc;
            return Documents::derive($doc['id'], 'invoice', ['date' => $data['date'], 'due_date' => $data['due_date'] ?? null, 'lines' => array_map(fn ($l) => ['line_id' => $l['id'], 'quantity' => $l['quantity']], $doc['lines'])], $r->user()->id, $r->header('Idempotency-Key'));
        });
    }

    public function derive(Request $r, int $id, string $type)
    {
        abort_unless(in_array($type, ['receipt', 'invoice', 'shipment']), 404);
        Access::require($r->user(), ['receipt' => 'purchase.write', 'invoice' => 'invoice.write', 'shipment' => 'shipment.write'][$type]);
        $data = $r->validate(['date' => 'required|date_format:Y-m-d', 'due_date' => 'nullable|date_format:Y-m-d|after_or_equal:date', 'notes' => 'nullable|string|max:5000', 'lines' => 'required|array|min:1|max:100', 'lines.*.line_id' => 'required|integer|distinct', 'lines.*.quantity' => 'required|numeric|gt:0|max:1000000|decimal:0,3']);
        return $this->run($r, 'derive:'.$id.':'.$type, $data, fn () => Documents::derive($id, $type, $data, $r->user()->id, $r->header('Idempotency-Key')));
    }

    public function pay(Request $r, int $id)
    {
        Access::require($r->user(), 'payment.write');
        $data = $r->validate(['amount' => 'required|numeric|gt:0|max:999999999|decimal:0,2', 'date' => 'required|date_format:Y-m-d', 'payment_method_id' => ['required', $this->active('payment_methods')], 'reference' => 'nullable|string|max:180']);
        return $this->run($r, 'pay:'.$id, $data, fn () => Documents::pay($id, $data, $r->user()->id));
    }

    public function payments(Request $r)
    {
        $r->validate(['page' => 'sometimes|integer|min:1']);
        $q = DB::table('payments as p')->join('documents as d', 'd.id', '=', 'p.invoice_id')->select('p.*', 'd.number as invoice_number', 'd.currency');
        if ($r->user()->role === 'customer') $q->where('d.customer_id', $r->user()->customer_id ?? 0);
        return $q->orderByDesc('p.id')->paginate(20);
    }

    public function cancel(Request $r, int $id)
    {
        Access::require($r->user(), 'cancel'); $data = $r->validate(['reason' => 'required|string|min:5|max:1000']);
        return $this->run($r, 'cancel:'.$id, $data, fn () => Documents::cancel($id, $data['reason'], $r->user()->id, $r->header('Idempotency-Key')));
    }

    public function cancelPayment(Request $r, int $id)
    {
        Access::require($r->user(), 'cancel'); $data = $r->validate(['reason' => 'required|string|min:5|max:1000']);
        return $this->run($r, 'cancel-payment:'.$id, $data, fn () => Documents::cancelPayment($id, $data['reason'], $r->user()->id));
    }

    public function deliver(Request $r, int $id)
    {
        Access::require($r->user(), 'shipment.write');
        return $this->run($r, 'deliver:'.$id, [], function () use ($r, $id) {
            $doc = DB::table('documents')->where('id', $id)->lockForUpdate()->first();
            abort_unless($doc && $doc->type === 'shipment' && $doc->status === 'packed', 422, 'El despacho no está pendiente de entrega.');
            DB::table('documents')->where('id', $id)->update(['status' => 'delivered', 'delivered_at' => now(), 'updated_at' => now()]);
            Operations::audit($r->user()->id, 'delivered', 'documents', $id);
            return Documents::detail($id);
        });
    }

    public function stock(Request $r)
    {
        abort_if($r->user()->role === 'customer', 403);
        $r->validate(['location_id' => 'nullable|exists:locations,id', 'page' => 'sometimes|integer|min:1']);
        return DB::table('stock_balances as b')->join('items as i', 'i.id', '=', 'b.item_id')->join('locations as l', 'l.id', '=', 'b.location_id')->select('b.*', 'i.sku', 'i.name', 'i.min_stock', 'l.name as location_name')->when($r->location_id, fn ($q) => $q->where('location_id', $r->location_id))->orderBy('i.sku')->orderBy('l.id')->paginate(20);
    }

    public function moves(Request $r)
    {
        abort_if($r->user()->role === 'customer', 403);
        $r->validate(['item_id' => 'nullable|exists:items,id', 'page' => 'sometimes|integer|min:1']);
        return DB::table('stock_moves as m')->join('items as i', 'i.id', '=', 'm.item_id')->join('locations as l', 'l.id', '=', 'm.location_id')->select('m.*', 'i.sku', 'i.name', 'l.name as location_name')->when($r->item_id, fn ($q) => $q->where('item_id', $r->item_id))->orderByDesc('m.id')->paginate(20);
    }

    public function adjust(Request $r)
    {
        Access::require($r->user(), 'inventory.write');
        $data = $r->validate(['item_id' => ['required', $this->active('items')], 'location_id' => ['required', $this->active('locations')], 'quantity' => 'required|numeric|not_in:0|min:-1000000|max:1000000|decimal:0,3', 'reason' => 'required|string|min:5|max:1000']);
        return $this->run($r, 'adjust', $data, function () use ($r, $data) {
            Inventory::move($data['item_id'], $data['location_id'], Decimal::units($data['quantity'], 3), $r->user()->id, $r->header('Idempotency-Key'), 'adjustment', $data['reason']);
            Operations::audit($r->user()->id, 'adjustment', 'items', (int) $data['item_id'], $data);
            return ['success' => true];
        });
    }

    public function transfer(Request $r)
    {
        Access::require($r->user(), 'inventory.write');
        $data = $r->validate(['from_location_id' => ['required', $this->active('locations')], 'to_location_id' => ['required', 'different:from_location_id', $this->active('locations')], 'reason' => 'required|string|min:5|max:1000', 'lines' => 'required|array|min:1|max:100', 'lines.*.item_id' => ['required', 'integer', 'distinct', $this->active('items')], 'lines.*.quantity' => 'required|numeric|gt:0|max:1000000|decimal:0,3']);
        return $this->run($r, 'transfer', $data, function () use ($r, $data) {
            $lines = $data['lines']; usort($lines, fn ($a, $b) => $a['item_id'] <=> $b['item_id']);
            foreach ($lines as $line) foreach ([$data['from_location_id'] => -1, $data['to_location_id'] => 1] as $location => $sign) Inventory::move($line['item_id'], $location, Decimal::units($line['quantity'], 3) * $sign, $r->user()->id, $r->header('Idempotency-Key'), $sign < 0 ? 'transfer_out' : 'transfer_in', $data['reason']);
            Operations::audit($r->user()->id, 'transfer', 'locations', (int) $data['from_location_id'], $data);
            return ['success' => true];
        });
    }
}
