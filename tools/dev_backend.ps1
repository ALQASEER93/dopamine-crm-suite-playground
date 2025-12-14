param()
$ErrorActionPreference = "Stop"
$backendPath = "D:\\ALQASEER_DEV\\dopamine-crm-suite_PLAYGROUND\\CRM\\backend"
if (-not (Test-Path $backendPath)) { Write-Host "Backend path not found: $backendPath"; exit 1 }
Set-Location $backendPath
$venvActivate = Join-Path $backendPath '.venv\\Scripts\\Activate.ps1'
if (Test-Path $venvActivate) {
    . $venvActivate
    Write-Host "Activated venv at $venvActivate"
} else {
    Write-Host "Virtual env not found at $venvActivate"
}
if (Test-Path 'manage.py') {
    Write-Host "Starting Django dev server..."
    python manage.py runserver
} elseif (Get-ChildItem -Filter '*.py' -Recurse | Select-String -Pattern 'uvicorn' -SimpleMatch | Select-Object -First 1) {
    Write-Host "Starting uvicorn on main:app (override inside script if different)..."
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
} else {
    Write-Host "Unable to auto-detect backend entrypoint. Start manually from $backendPath."
}
