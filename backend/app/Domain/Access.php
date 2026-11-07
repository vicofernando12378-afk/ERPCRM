<?php

namespace App\Domain;

use App\Models\User;

final class Access
{
    public const ROLES = ['admin', 'manager', 'sales', 'warehouse', 'finance', 'customer'];
    public const RIGHTS = [
        'manager' => ['catalog.write', 'inventory.write', 'purchase.write', 'sales.write', 'invoice.write', 'payment.write', 'shipment.write', 'cancel', 'reports'],
        'sales' => ['sales.write', 'invoice.write', 'reports'],
        'warehouse' => ['inventory.write', 'purchase.write', 'shipment.write', 'reports'],
        'finance' => ['payment.write', 'reports'],
        'customer' => [],
    ];

    public static function require(User $user, string $right): void
    {
        abort_unless($user->active && ($user->role === 'admin' || in_array($right, self::permissions($user), true)), 403, 'No tienes permiso para esta operación.');
    }

    public static function permissions(User $user): array
    {
        if ($user->role === 'admin') return ['*'];
        if ($user->role === 'customer') return [];
        return json_decode(\Illuminate\Support\Facades\DB::table('roles')->where('slug', $user->role)->value('permissions') ?? '[]', true);
    }
}
