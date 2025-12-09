param(
    [switch]$DryRun
)

Set-Location "C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\\AI-Orchestrator"

if ($DryRun) {
    Write-Host "Running Daily Monitor (dry run)..." -ForegroundColor Cyan
    npm run monitor -- --dry-run
} else {
    Write-Host "Running Daily Monitor (real email)..." -ForegroundColor Cyan
    npm run monitor
}

