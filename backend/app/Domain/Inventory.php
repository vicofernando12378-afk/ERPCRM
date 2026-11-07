<?php

namespace App\Domain;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class Inventory
{
    public static function move(int $item, int $location, int $delta, int $user, string $operation, string $type, string $reason, ?int $document = null): void
    {
        // Serialize all stock changes for an item, including first balance creation.
        $product = DB::table('items')->where('id', $item)->lockForUpdate()->first();
        abort_unless($product, 404, 'Producto no encontrado.');
        DB::table('stock_balances')->insertOrIgnore(['item_id' => $item, 'location_id' => $location, 'quantity' => '0.000', 'created_at' => now(), 'updated_at' => now()]);
        $balance = DB::table('stock_balances')->where(['item_id' => $item, 'location_id' => $location])->lockForUpdate()->first();
        $next = Decimal::units($balance->quantity, 3) + $delta;
        if ($next < 0) throw ValidationException::withMessages(['stock' => 'Stock insuficiente para '.$product->sku.'.']);
        DB::table('stock_balances')->where('id', $balance->id)->update(['quantity' => Decimal::text($next, 3), 'updated_at' => now()]);
        DB::table('stock_moves')->insert(['operation_id' => $operation, 'item_id' => $item, 'location_id' => $location, 'document_id' => $document, 'created_by' => $user, 'type' => $type, 'quantity' => Decimal::text($delta, 3), 'balance_after' => Decimal::text($next, 3), 'reason' => $reason, 'created_at' => now()]);
    }
}
