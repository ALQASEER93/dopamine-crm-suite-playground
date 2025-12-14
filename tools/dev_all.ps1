param(
    [switch]$NoBackend,
    [switch]$NoFrontend
)

Set-StrictMode -Version Latest

$root = "D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND"
$toolsDir = Join-Path $root "tools"
$backendScript = Join-Path $toolsDir "dev_backend.ps1"
$frontendScript = Join-Path $toolsDir "dev_frontend.ps1"

Write-Host "dev_all.ps1 starting..."
Write-Host "Root:          $root"
Write-Host "Backend script: $backendScript"
Write-Host "Frontend script: $frontendScript"
Write-Host ""

if (-not (Test-Path $backendScript)) {
    Write-Warning "Backend dev script not found at: $backendScript"
}

if (-not (Test-Path $frontendScript)) {
    Write-Warning "Frontend dev script not found at: $frontendScript"
}

if (-not $NoBackend -and (Test-Path $backendScript)) {
    Write-Host "Launching backend dev window..."
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-File", """$backendScript"""
    ) | Out-Null
} elseif ($NoBackend) {
    Write-Host "Backend launch skipped due to -NoBackend switch."
}

if (-not $NoFrontend -and (Test-Path $frontendScript)) {
    Write-Host "Launching frontend dev window..."
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-File", """$frontendScript"""
    ) | Out-Null
} elseif ($NoFrontend) {
    Write-Host "Frontend launch skipped due to -NoFrontend switch."
}

Write-Host ""
Write-Host "dev_all.ps1 finished. Check the opened PowerShell windows for backend and frontend servers."
