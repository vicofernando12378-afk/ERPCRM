<?php

namespace App\Domain;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class Documents
{
    public static function create(string $type, array $data, int $user): array
    {
        $partyTable = $type === 'purchase' ? 'suppliers' : 'customers';
        $partyKey = $type === 'purchase' ? 'supplier_id' : 'customer_id';
        $party = DB::table($partyTable)->find($data[$partyKey]);
        if (isset($data['branch_id'])) abort_unless(DB::table('branches')->where(['id' => $data['branch_id'], 'customer_id' => $data['customer_id'] ?? null, 'active' => true])->exists(), 422, 'La sucursal no pertenece al cliente.');
        $lines = [];
        foreach ($data['lines'] as $line) {
            $item = DB::table('items')->find($line['item_id']);
            $tax = $item->tax_id ? DB::table('taxes')->find($item->tax_id) : null;
            $line['tax_percent'] = $line['tax_percent'] ?? ($tax->rate ?? '0');
            $line['description'] = $item->name;
            $lines[] = $line;
        }
        return self::persist($type, $data, $lines, $user, (array) $party);
    }

    private static function persist(string $type, array $data, array $lines, int $user, array $party): array
    {
        $totals = ['subtotal' => 0, 'tax_total' => 0, 'total' => 0];
        $normalized = [];
        foreach ($lines as $line) {
            $amounts = Decimal::line($line);
            foreach ($totals as $k => $v) $totals[$k] += Decimal::units($amounts[$k]);
            $normalized[] = ['item_id' => $line['item_id'], 'parent_line_id' => $line['parent_line_id'] ?? null, 'description' => $line['description'], 'quantity' => Decimal::text(Decimal::units($line['quantity'], 3), 3), 'unit_price' => Decimal::text(Decimal::units($line['unit_price'])), 'discount_percent' => $line['discount_percent'] ?? 0, 'tax_percent' => $line['tax_percent'] ?? 0] + $amounts;
        }
        $id = DB::table('documents')->insertGetId([
            'type' => $type, 'number' => Operations::number($type), 'parent_id' => $data['parent_id'] ?? null,
            'customer_id' => $data['customer_id'] ?? null, 'supplier_id' => $data['supplier_id'] ?? null,
            'branch_id' => $data['branch_id'] ?? null, 'location_id' => $data['location_id'], 'created_by' => $user,
            'status' => $type === 'shipment' ? 'packed' : 'confirmed', 'date' => $data['date'], 'due_date' => $data['due_date'] ?? null,
            'currency' => $data['currency'], 'notes' => $data['notes'] ?? null, 'party_snapshot' => json_encode($party),
            ...array_map(fn ($v) => Decimal::text($v), $totals), 'created_at' => now(), 'updated_at' => now(),
        ]);
        foreach ($normalized as $line) DB::table('document_lines')->insert(['document_id' => $id] + $line);
        Operations::audit($user, 'created', 'documents', $id);
        return self::detail($id);
    }

    public static function detail(int $id): array
    {
        $doc = DB::table('documents')->find($id);
        abort_unless($doc, 404, 'Documento no encontrado.');
        $result = (array) $doc;
        $result['party_snapshot'] = json_decode($doc->party_snapshot, true);
        $result['lines'] = DB::table('document_lines')->where('document_id', $id)->orderBy('id')->get()->map(function ($line) {
            $result = (array) $line;
            foreach (['invoice', 'receipt', 'shipment'] as $type) $result[$type.'_quantity'] = Decimal::text(self::used($line->id, $type), 3);
            return $result;
        })->all();
        $result['children'] = DB::table('documents')->where('parent_id', $id)->orderBy('id')->get()->all();
        $result['payments'] = DB::table('payments')->where('invoice_id', $id)->get()->all();
        return $result;
    }

    private static function used(int $line, string $type): int
    {
        $qty = DB::table('document_lines as l')->join('documents as d', 'd.id', '=', 'l.document_id')->where('l.parent_line_id', $line)->where('d.type', $type)->where('d.status', '!=', 'cancelled')->sum('l.quantity');
        return Decimal::units((string) $qty, 3);
    }

    public static function derive(int $parentId, string $type, array $data, int $user, string $key): array
    {
        $parent = DB::table('documents')->where('id', $parentId)->lockForUpdate()->first();
        abort_unless($parent && $parent->type === ($type === 'receipt' ? 'purchase' : 'order'), 404, 'Documento de origen inválido.');
        abort_if($parent->status === 'cancelled', 422, 'El documento está anulado.');
        $lines = [];
        foreach ($data['lines'] as $requested) {
            $line = DB::table('document_lines')->where(['id' => $requested['line_id'], 'document_id' => $parentId])->first();
            abort_unless($line, 422, 'La línea no pertenece al documento.');
            $requestedQty = Decimal::units($requested['quantity'], 3);
            $maximum = $type === 'shipment' ? self::used($line->id, 'invoice') : Decimal::units($line->quantity, 3);
            $pending = $maximum - self::used($line->id, $type);
            if ($requestedQty <= 0 || $requestedQty > $pending) throw ValidationException::withMessages(['lines' => 'La cantidad supera el pendiente de '.$line->description.' ('.Decimal::text($pending, 3).').']);
            $lines[] = ['parent_line_id' => $line->id, 'item_id' => $line->item_id, 'description' => $line->description, 'quantity' => $requested['quantity'], 'unit_price' => $line->unit_price, 'discount_percent' => $line->discount_percent, 'tax_percent' => $line->tax_percent];
        }
        usort($lines, fn ($a, $b) => $a['item_id'] <=> $b['item_id']);
        $derived = self::persist($type, ['parent_id' => $parentId, 'customer_id' => $parent->customer_id, 'supplier_id' => $parent->supplier_id, 'branch_id' => $parent->branch_id, 'location_id' => $parent->location_id, 'currency' => $parent->currency, 'date' => $data['date'], 'due_date' => $data['due_date'] ?? null, 'notes' => $data['notes'] ?? null], $lines, $user, json_decode($parent->party_snapshot, true));
        if (in_array($type, ['invoice', 'receipt'])) foreach ($lines as $line) {
            Inventory::move($line['item_id'], $parent->location_id, Decimal::units($line['quantity'], 3) * ($type === 'invoice' ? -1 : 1), $user, $key, $type, $derived['number'], $derived['id']);
        }
        return $derived;
    }

    public static function pay(int $invoiceId, array $data, int $user): array
    {
        $invoice = DB::table('documents')->where('id', $invoiceId)->lockForUpdate()->first();
        abort_unless($invoice && $invoice->type === 'invoice', 404, 'Factura no encontrada.');
        abort_if($invoice->status === 'cancelled', 422, 'La factura está anulada.');
        $amount = Decimal::units($data['amount']);
        $paid = Decimal::units($invoice->paid);
        abort_if($amount <= 0 || $paid + $amount > Decimal::units($invoice->total), 422, 'El pago debe ser positivo y no exceder el saldo.');
        $id = DB::table('payments')->insertGetId(['invoice_id' => $invoiceId, 'number' => Operations::number('payment'), 'amount' => Decimal::text($amount), 'payment_method_id' => $data['payment_method_id'], 'date' => $data['date'], 'reference' => $data['reference'] ?? null, 'created_by' => $user, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('documents')->where('id', $invoiceId)->update(['paid' => Decimal::text($paid + $amount), 'updated_at' => now()]);
        Operations::audit($user, 'created', 'payments', $id);
        return (array) DB::table('payments')->find($id);
    }

    public static function cancelPayment(int $id, string $reason, int $user): array
    {
        $payment = DB::table('payments')->find($id);
        abort_unless($payment, 404);
        $invoice = DB::table('documents')->where('id', $payment->invoice_id)->lockForUpdate()->first();
        $payment = DB::table('payments')->where('id', $id)->lockForUpdate()->first();
        abort_if($payment->status === 'cancelled', 422, 'El cobro ya está anulado.');
        DB::table('documents')->where('id', $invoice->id)->update(['paid' => Decimal::text(Decimal::units($invoice->paid) - Decimal::units($payment->amount)), 'updated_at' => now()]);
        DB::table('payments')->where('id', $id)->update(['status' => 'cancelled', 'cancellation_reason' => $reason, 'updated_at' => now()]);
        Operations::audit($user, 'cancelled', 'payments', $id, ['reason' => $reason]);
        return (array) DB::table('payments')->find($id);
    }

    public static function cancel(int $id, string $reason, int $user, string $key): array
    {
        $initial = DB::table('documents')->find($id);
        abort_unless($initial, 404);
        // Same parent lock as partial creation prevents cancellation/derivation races.
        if ($initial->parent_id) DB::table('documents')->where('id', $initial->parent_id)->lockForUpdate()->first();
        $doc = DB::table('documents')->where('id', $id)->lockForUpdate()->first();
        abort_if($doc->status === 'cancelled', 422, 'El documento ya está anulado.');
        abort_if(DB::table('documents')->where('parent_id', $id)->where('status', '!=', 'cancelled')->exists(), 422, 'Anula primero los documentos dependientes.');
        abort_if(DB::table('payments')->where('invoice_id', $id)->where('status', '!=', 'cancelled')->exists(), 422, 'Anula primero los cobros.');
        if ($doc->type === 'invoice') abort_if(DB::table('documents')->where(['parent_id' => $doc->parent_id, 'type' => 'shipment'])->where('status', '!=', 'cancelled')->exists(), 422, 'Anula primero los despachos del pedido.');
        if (in_array($doc->type, ['receipt', 'invoice'])) {
            foreach (DB::table('document_lines')->where('document_id', $id)->orderBy('item_id')->get() as $line) Inventory::move($line->item_id, $doc->location_id, Decimal::units($line->quantity, 3) * ($doc->type === 'receipt' ? -1 : 1), $user, $key, 'reversal', $reason, $id);
        }
        DB::table('documents')->where('id', $id)->update(['status' => 'cancelled', 'cancellation_reason' => $reason, 'updated_at' => now()]);
        Operations::audit($user, 'cancelled', 'documents', $id, ['reason' => $reason]);
        return self::detail($id);
    }
}
