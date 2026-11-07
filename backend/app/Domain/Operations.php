<?php

namespace App\Domain;

use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class Operations
{
    public static function run(int $userId, string $key, string $action, array $payload, Closure $callback): array
    {
        if (! Str::isUuid($key)) throw ValidationException::withMessages(['idempotency_key' => 'Se requiere una clave UUID para evitar operaciones duplicadas.']);
        $hash = hash('sha256', json_encode([$action, $payload], JSON_THROW_ON_ERROR));
        return DB::transaction(function () use ($userId, $key, $hash, $callback) {
            DB::table('operations')->insertOrIgnore(['user_id' => $userId, 'key' => $key, 'request_hash' => $hash, 'created_at' => now(), 'updated_at' => now()]);
            $op = DB::table('operations')->where(['user_id' => $userId, 'key' => $key])->lockForUpdate()->first();
            abort_if($op->request_hash !== $hash, 409, 'Esta clave ya fue usada para una operación diferente.');
            if ($op->result !== null) return json_decode($op->result, true, flags: JSON_THROW_ON_ERROR);
            $result = $callback();
            DB::table('operations')->where('id', $op->id)->update(['result' => json_encode($result, JSON_THROW_ON_ERROR), 'updated_at' => now()]);
            return $result;
        }, 5);
    }

    public static function number(string $type): string
    {
        DB::table('sequences')->insertOrIgnore(['name' => $type, 'value' => 0]);
        $seq = DB::table('sequences')->where('name', $type)->lockForUpdate()->first();
        DB::table('sequences')->where('name', $type)->update(['value' => $seq->value + 1]);
        $prefix = ['purchase' => 'OC', 'receipt' => 'REC', 'order' => 'PV', 'invoice' => 'FAC', 'shipment' => 'DES', 'payment' => 'COB'][$type];
        return $prefix.'-'.str_pad((string) ($seq->value + 1), 8, '0', STR_PAD_LEFT);
    }

    public static function audit(int $userId, string $action, string $entity, int $id, array $details = []): void
    {
        DB::table('audit_events')->insert(['user_id' => $userId, 'action' => $action, 'entity' => $entity, 'entity_id' => $id, 'details' => json_encode($details, JSON_THROW_ON_ERROR), 'created_at' => now()]);
    }
}
