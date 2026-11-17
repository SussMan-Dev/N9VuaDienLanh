# PowerShell Script: Backup MySQL database
param (
  [string]$DbName = "electrical_repair_management",
  [string]$DbUser = "root",
  [string]$BackupDir = "backups",
  [string]$MysqlDumpPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$targetFile = Join-Path $BackupDir "${DbName}_backup_${timestamp}.sql"

if (-not (Test-Path $MysqlDumpPath)) {
  $MysqlDumpPath = (Get-Command mysqldump -ErrorAction SilentlyContinue).Source
  if (-not $MysqlDumpPath) {
    Write-Error "mysqldump.exe not found! Please specify -MysqlDumpPath"
    exit 1
  }
}

Write-Host "Creating backup of database '$DbName' to '$targetFile'..."
& $MysqlDumpPath -u $DbUser -p --single-transaction --routines --triggers --databases $DbName --result-file=$targetFile

if (Test-Path $targetFile) {
  $fileSize = (Get-Item $targetFile).Length
  Write-Host "✅ Backup completed successfully! File size: $fileSize bytes."
} else {
  Write-Error "Backup failed: File was not created."
  exit 1
}

