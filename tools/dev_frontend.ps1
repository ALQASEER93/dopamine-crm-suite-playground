param()
$ErrorActionPreference = "Stop"
$frontendPath = "D:\\ALQASEER_DEV\\dopamine-crm-suite_PLAYGROUND\\CRM\\frontend"
if (-not (Test-Path $frontendPath)) { Write-Host "Frontend path not found: $frontendPath"; exit 1 }
Set-Location $frontendPath
if (Test-Path 'package.json') {
    $pkg = Get-Content -Raw package.json | ConvertFrom-Json
    if ($pkg.scripts -and $pkg.scripts.dev) {
        Write-Host "Running npm run dev..."
        npm run dev
    } else {
        Write-Host "No dev script found in package.json. Start manually from $frontendPath."
    }
} else {
    Write-Host "package.json not found in $frontendPath"
}
