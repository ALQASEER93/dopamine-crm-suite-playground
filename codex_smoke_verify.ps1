$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $PSScriptRoot "scripts\\codex_smoke_verify.ps1"
if (-not (Test-Path $scriptPath)) {
    Write-Host "Missing smoke script at $scriptPath"
    exit 1
}
powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath
