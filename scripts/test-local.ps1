param([switch]$MySQL)
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$php = Join-Path $project '.tools/php/php.exe'
$previousEnvironment = @{}
'DB_CONNECTION','DB_HOST','DB_PORT','DB_DATABASE','DB_USERNAME','DB_PASSWORD' | ForEach-Object { $previousEnvironment[$_] = [Environment]::GetEnvironmentVariable($_, 'Process') }
Push-Location (Join-Path $project 'backend')
try {
    if ($MySQL) {
        $credentials = Get-Content (Join-Path $project '.tools/mysql-credentials.json') -Raw | ConvertFrom-Json
        $env:DB_CONNECTION = 'mysql'; $env:DB_HOST = '127.0.0.1'; $env:DB_PORT = '3307'
        $env:DB_DATABASE = 'erp_testing'; $env:DB_USERNAME = 'erp_app'; $env:DB_PASSWORD = $credentials.app_password
    }
    & $php artisan test --compact
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas del backend.' }
} finally {
    if ($MySQL) { $previousEnvironment.Keys | ForEach-Object { [Environment]::SetEnvironmentVariable($_, $previousEnvironment[$_], 'Process') } }
    Pop-Location
}
Push-Location (Join-Path $project 'frontend')
try { npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación del frontend.' } } finally { Pop-Location }
