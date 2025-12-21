param()

$ErrorActionPreference="Stop"
Set-StrictMode -Version Latest

function Port-Open([int]$port){
  try { return (Test-NetConnection 127.0.0.1 -Port $port -InformationLevel Quiet) } catch { return $false }
}

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

# Try to start CRM (prefer existing repo scripts if present)
$startCmd = @(
  Join-Path $repo "tools\START_CRM_DEV.cmd"
  Join-Path $repo "tools\start_crm_dev.cmd"
  Join-Path $repo "tools\START_BACKEND.cmd"
  Join-Path $repo "tools\start_backend.cmd"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($startCmd) {
  Write-Host "Starting CRM using: $startCmd"
  Start-Process cmd -WorkingDirectory (Split-Path $startCmd) -ArgumentList "/c", "`"$startCmd`""
} else {
  Write-Host "No START_*.cmd found. Will try common FastAPI command in a new window:"
  $backendDir = Join-Path $repo "CRM\backend"
  Start-Process powershell -WorkingDirectory $backendDir -ArgumentList "-NoExit","-Command","python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
}

Start-Sleep -Seconds 2

if (Port-Open 8000) {
  Write-Host " Backend is reachable on http://127.0.0.1:8000"
} else {
  Write-Host " Backend NOT reachable on port 8000 yet."
  Write-Host "This is the #1 reason your PWA login shows: (login failed message...)"
}

# Start PWA preview
$pwaDir = Join-Path $repo "ALQASEER-PWA"
Write-Host "Starting PWA preview on http://127.0.0.1:4174"
Start-Process powershell -WorkingDirectory $pwaDir -ArgumentList "-NoExit","-Command","npm run preview -- --host 127.0.0.1 --port 4174"

Write-Host ""
Write-Host "Open:"
Write-Host "PWA: http://127.0.0.1:4174/"
Write-Host "Backend: http://127.0.0.1:8000/"
Write-Host ""
Write-Host "If login still fails AFTER backend is reachable, we will run the repo smoke login script next."
