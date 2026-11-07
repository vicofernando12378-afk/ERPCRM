<?php
// Runs only against the isolated test database, with two independent PHP connections.
require __DIR__.'/../backend/vendor/autoload.php';
$credentials = json_decode(file_get_contents(__DIR__.'/../.tools/mysql-credentials.json'), true);
foreach (['DB_CONNECTION' => 'mysql', 'DB_HOST' => '127.0.0.1', 'DB_PORT' => '3307', 'DB_DATABASE' => 'erp_testing', 'DB_USERNAME' => 'erp_app', 'DB_PASSWORD' => $credentials['app_password']] as $k => $v) { putenv($k.'='.$v); $_ENV[$k] = $v; }
$app = require __DIR__.'/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (Illuminate\Support\Facades\DB::connection()->getDatabaseName() !== 'erp_testing') throw new RuntimeException('Solo se permite erp_testing.');

use App\Domain\{Documents, Inventory, Operations};
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

if (($argv[1] ?? '') === 'worker') {
    try {
        Operations::run((int) $argv[2], (string) Str::uuid(), 'concurrent-sale', [], fn () => Documents::derive((int) $argv[3], 'invoice', ['date' => '2026-11-07', 'lines' => [['line_id' => (int) $argv[4], 'quantity' => 1]]], (int) $argv[2], (string) Str::uuid()));
        echo 'CONFIRMED';
    } catch (Illuminate\Validation\ValidationException $e) { echo 'INSUFFICIENT_STOCK'; }
    exit;
}
$tag = 'CONC-'.Str::random(12); $ts = ['created_at' => now(), 'updated_at' => now()];
$user = new User; $user->forceFill(['name' => 'Concurrency test', 'email' => $tag.'@example.test', 'password' => bcrypt(Str::random(40)), 'role' => 'admin'])->save();
$customer = DB::table('customers')->insertGetId(['name' => $tag] + $ts);
$location = DB::table('locations')->insertGetId(['code' => $tag, 'name' => $tag] + $ts);
$unit = DB::table('units')->insertGetId(['name' => $tag] + $ts);
$item = DB::table('items')->insertGetId(['sku' => $tag, 'name' => $tag, 'unit_id' => $unit] + $ts);
$orders = DB::transaction(function () use ($user, $customer, $location, $item) {
    Inventory::move($item, $location, 1000, $user->id, (string) Str::uuid(), 'adjustment', 'Concurrency test');
    $data = ['customer_id' => $customer, 'location_id' => $location, 'currency' => 'PEN', 'date' => '2026-11-07', 'lines' => [['item_id' => $item, 'quantity' => 1, 'unit_price' => 10]]];
    return [Documents::create('order', $data, $user->id), Documents::create('order', $data, $user->id)];
});
$workers = [];
foreach ($orders as $order) {
    $pipes = [];
    $process = proc_open([PHP_BINARY, __FILE__, 'worker', (string) $user->id, (string) $order['id'], (string) $order['lines'][0]['id']], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    $workers[] = [$process, $pipes];
}
$results = [];
foreach ($workers as [$process, $pipes]) { $results[] = trim(stream_get_contents($pipes[1])); $error = stream_get_contents($pipes[2]); fclose($pipes[1]); fclose($pipes[2]); if (proc_close($process) !== 0) throw new RuntimeException($error); }
sort($results);
$balance = DB::table('stock_balances')->where(['item_id' => $item, 'location_id' => $location])->value('quantity');
if ($results !== ['CONFIRMED', 'INSUFFICIENT_STOCK'] || (float) $balance !== 0.0) throw new RuntimeException('Concurrency invariant failed: '.json_encode($results));
echo "PASS: dos procesos, una factura confirmada, un rechazo por stock y saldo cero.\n";
