# PowerShell Script: Restore MySQL database from SQL backup file
param (
  [Parameter(Mandatory=$true)]
  [string]$BackupFile,
  [string]$DbUser = "root",
  [string]$MysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
  Write-Error "Backup file not found at: $BackupFile"
  exit 1
}

if (-not (Test-Path $MysqlPath)) {
  $MysqlPath = (Get-Command mysql -ErrorAction SilentlyContinue).Source
  if (-not $MysqlPath) {
    Write-Error "mysql.exe not found! Please specify -MysqlPath"
    exit 1
  }
}

Write-Host "Restoring database from '$BackupFile'..."
Get-Content $BackupFile | & $MysqlPath -u $DbUser -p

Write-Host "✅ Database restore completed successfully!"

