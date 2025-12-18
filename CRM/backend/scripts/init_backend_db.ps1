$ErrorActionPreference = "Stop"

Write-Host "Initializing CRM backend database..." -ForegroundColor Cyan

# Activate venv if present
$venvPath = Join-Path $PSScriptRoot "..\.venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
  Write-Host "Activating virtual environment at $venvPath"
  . $venvPath
}

$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot

# Database path is relative to backend root (data/fastapi.db by default)
# FastAPI settings handle the path automatically via DATABASE_URL
$dbPath = Join-Path $projectRoot "data\fastapi.db"
$dbDir = Split-Path $dbPath -Parent
if (-not (Test-Path $dbDir)) {
  Write-Host "Creating data directory at $dbDir"
  New-Item -ItemType Directory -Path $dbDir -Force | Out-Null
}

try {
  Write-Host "Running database initialization (python -m main init-db)..."
  python -m main init-db
  Write-Host "Database initialized at $dbPath" -ForegroundColor Green
} catch {
  Write-Error "Failed to initialize database: $_"
  exit 1
}

