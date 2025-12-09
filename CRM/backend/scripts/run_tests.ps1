$ErrorActionPreference = "Stop"

Write-Host "Running backend tests..." -ForegroundColor Cyan

# Activate venv if present
$venvPath = Join-Path $PSScriptRoot "..\.venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
  Write-Host "Activating virtual environment at $venvPath"
  . $venvPath
}

Set-Location (Join-Path $PSScriptRoot "..")
python -m pytest -q
