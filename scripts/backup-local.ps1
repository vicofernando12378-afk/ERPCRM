$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$localTools = Join-Path $project '.tools'
$directory = Join-Path $localTools 'backups'
New-Item -ItemType Directory -Force -Path $directory | Out-Null
$credentials = Get-Content (Join-Path $localTools 'mysql-credentials.json') -Raw | ConvertFrom-Json
$defaults = Join-Path $localTools 'backup-client.cnf'
$file = Join-Path $directory ('erp-local-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.sql')
try {
    @('[client]', 'host=127.0.0.1', 'port=3307', 'user=erp_app', "password=$($credentials.app_password)") | Set-Content -LiteralPath $defaults
    & (Join-Path $localTools 'mysql/mysql-8.4.13-winx64/bin/mysqldump.exe') "--defaults-extra-file=$defaults" --single-transaction --no-tablespaces --set-gtid-purged=OFF --routines --triggers "--result-file=$file" erp_local
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo completar el respaldo.' }
    $archive = [System.IO.Path]::ChangeExtension($file, '.files.zip')
    $privateStorage = Join-Path $project 'backend/storage/app/private'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($privateStorage, $archive)
    Get-FileHash -LiteralPath $archive -Algorithm SHA256 | Select-Object Hash,Path
    Get-FileHash -LiteralPath $file -Algorithm SHA256 | Select-Object Hash,Path
} finally {
    if (Test-Path -LiteralPath $defaults) { Remove-Item -LiteralPath $defaults }
}
