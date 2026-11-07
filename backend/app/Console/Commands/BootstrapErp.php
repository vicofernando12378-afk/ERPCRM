<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\{DB, Hash};

class BootstrapErp extends Command
{
    protected $signature = 'erp:bootstrap {email} {--demo : Crear catálogos de demostración sin movimientos de stock}';
    protected $description = 'Crear el primer administrador y configuración inicial sin sobrescribir usuarios';

    public function handle(): int
    {
        $email = $this->argument('email');
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) { $this->error('Correo inválido.'); return self::FAILURE; }
        if (User::where('role', 'admin')->exists()) { $this->error('Ya existe un administrador. Usa la administración de usuarios.'); return self::FAILURE; }
        $password = getenv('ERP_ADMIN_PASSWORD') ?: $this->secret('Contraseña (12 caracteres, letras y números)');
        if (strlen($password ?? '') < 12 || ! preg_match('/[a-zA-Z]/', $password) || ! preg_match('/\d/', $password)) { $this->error('Contraseña insuficiente.'); return self::FAILURE; }
        DB::transaction(function () use ($email, $password) {
            $user = new User;
            $user->forceFill(['name' => 'Administrador', 'email' => $email, 'password' => Hash::make($password), 'role' => 'admin', 'active' => true])->save();
            DB::table('settings')->insert(['key' => 'company', 'value' => json_encode(['name' => 'Mi empresa', 'tax_id' => '', 'address' => '', 'email' => '', 'phone' => '', 'currency' => 'PEN']), 'created_at' => now(), 'updated_at' => now()]);
            foreach (['units' => ['Unidad', 'Kilogramo', 'Metro'], 'categories' => ['General'], 'payment_methods' => ['Efectivo', 'Transferencia', 'Tarjeta'], 'price_lists' => ['General', 'Mayorista']] as $table => $names) foreach ($names as $name) DB::table($table)->insert(['name' => $name, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('taxes')->insert(['name' => 'Sin impuesto', 'rate' => 0, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
            if ($this->option('demo')) {
                foreach (['customers' => 'Cliente de prueba', 'suppliers' => 'Proveedor de prueba'] as $table => $name) DB::table($table)->insert(['name' => $name, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
                foreach (['PRINCIPAL' => 'Almacén principal', 'SECUNDARIO' => 'Almacén secundario'] as $code => $name) DB::table('locations')->insert(['code' => $code, 'name' => $name, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
                DB::table('items')->insert(['sku' => 'DEMO-001', 'name' => 'Producto de demostración', 'unit_id' => DB::table('units')->value('id'), 'sale_price' => 25, 'purchase_price' => 15, 'min_stock' => 5, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
            }
        });
        $this->info('Administrador creado. El inventario inicial permanece en cero.');
        return self::SUCCESS;
    }
}
