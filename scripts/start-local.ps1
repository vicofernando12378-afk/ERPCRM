$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$localTools = Join-Path $project '.tools'
$php = Join-Path $localTools 'php/php.exe'
if (-not (Test-Path -LiteralPath $php)) { throw 'Falta PHP local. Consulta README.md.' }

function Port-Open([int]$port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try { $client.Connect('127.0.0.1', $port); return $true } catch { return $false } finally { $client.Dispose() }
}
$processes = @{}
if (-not (Port-Open 3307)) {
    $mysql = Join-Path $localTools 'mysql/mysql-8.4.13-winx64/bin/mysqld.exe'
    $processes.mysql = (Start-Process -FilePath $mysql -ArgumentList "--defaults-file=$localTools/mysql.ini" -WindowStyle Hidden -PassThru).Id
}
if (-not (Port-Open 8000)) {
    $router = Join-Path $project 'backend/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'
    $processes.php = (Start-Process -FilePath $php -ArgumentList '-S','127.0.0.1:8000',"`"$router`"" -WorkingDirectory (Join-Path $project 'backend/public') -RedirectStandardOutput (Join-Path $localTools 'php-server.log') -RedirectStandardError (Join-Path $localTools 'php-server-error.log') -WindowStyle Hidden -PassThru).Id
}
if (-not (Port-Open 3100)) {
    $processes.vite = (Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList 'node_modules/vite/bin/vite.js','--host','127.0.0.1' -WorkingDirectory (Join-Path $project 'frontend') -RedirectStandardOutput (Join-Path $localTools 'vite.log') -RedirectStandardError (Join-Path $localTools 'vite-error.log') -WindowStyle Hidden -PassThru).Id
}
$processes | ConvertTo-Json | Set-Content (Join-Path $localTools 'started-processes.json')
Write-Host 'ERP local: http://127.0.0.1:3100'
Write-Host 'Credenciales locales: .tools/acceso-local.txt'
