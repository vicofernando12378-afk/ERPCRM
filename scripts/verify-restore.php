<?php
$files = glob(__DIR__.'/../.tools/backups/erp-local-*.sql'); sort($files);
if (! $files) throw new RuntimeException('Ejecuta backup-local.ps1 primero.');
$credentials = json_decode(file_get_contents(__DIR__.'/../.tools/mysql-credentials.json'), true);
$pdo = new PDO('mysql:host=127.0.0.1;port=3307', 'root', $credentials['root_password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$target = 'erp_restore_'.gmdate('Ymd_His');
$pdo->exec("CREATE DATABASE `$target` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$pdo->exec("USE `$target`");
$pdo->exec(file_get_contents(end($files)));
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $table) {
    $restored = $pdo->query("SELECT COUNT(*) FROM `$target`.`$table`")->fetchColumn();
    $original = $pdo->query("SELECT COUNT(*) FROM erp_local.`$table`")->fetchColumn();
    if ($restored !== $original) throw new RuntimeException('Diferencia de registros: '.$table.'. No ejecutar con escrituras simultáneas.');
}
echo 'PASS: respaldo restaurado en '.$target.'; '.count($tables)." tablas verificadas.\n";
