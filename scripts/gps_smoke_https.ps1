$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runDir = Join-Path $repoRoot "docs\\_runs"
$reportPath = Join-Path $runDir ("gps_smoke_{0}.md" -f $timestamp)

function Port-Open([int]$port) {
  try { return (Test-NetConnection 127.0.0.1 -Port $port -InformationLevel Quiet) } catch { return $false }
}

function Stop-DevProcesses {
  $patterns = @("vite", "esbuild", "npm run dev", "ALQASEER-PWA", "CRM\\frontend")
  $candidates = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and (
      $_.Name -match "node|esbuild|vite" -or
      $_.CommandLine -match "node|esbuild|vite"
    )
  } | Where-Object {
    $match = $false
    foreach ($pattern in $patterns) {
      if ($_.CommandLine -match [regex]::Escape($pattern)) { $match = $true; break }
    }
    $match
  }

  if (-not $candidates) {
    Write-Host "No dev node/esbuild/vite processes found."
    return
  }

  foreach ($proc in $candidates) {
    Write-Host "Stopping PID $($proc.ProcessId): $($proc.CommandLine)"
    try { Stop-Process -Id $proc.ProcessId -Force } catch { Write-Warning $_.Exception.Message }
  }
}

if (-not (Test-Path $runDir)) { New-Item -ItemType Directory -Path $runDir | Out-Null }

Write-Host "=== GPS HTTPS Smoke ==="
Stop-DevProcesses

$backendUp = Port-Open 8000
$pwaUp = Port-Open 4174

if (-not $backendUp) {
  $backendScript = Join-Path $repoRoot "tools\\dev_backend.ps1"
  if (Test-Path $backendScript) {
    Write-Host "Starting backend via $backendScript ..."
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", """$backendScript"""
  } else {
    Write-Host "Backend not running. Start manually:"
    Write-Host "  cd CRM/backend"
    Write-Host "  python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
  }
} else {
  Write-Host "Backend already running on 8000."
}

if (-not $pwaUp) {
  $pwaDir = Join-Path $repoRoot "ALQASEER-PWA"
  if (Test-Path $pwaDir) {
    Write-Host "Starting PWA dev server on 4174..."
    Start-Process powershell -WorkingDirectory $pwaDir -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "npm run dev -- --host 0.0.0.0 --port 4174"
  } else {
    Write-Host "PWA directory not found. Start manually:"
    Write-Host "  cd ALQASEER-PWA"
    Write-Host "  npm run dev -- --host 0.0.0.0 --port 4174"
  }
} else {
  Write-Host "PWA already running on 4174."
}

Write-Host ""
Write-Host "=== HTTPS Tunnel ==="
Write-Host "Option A (Cloudflare Tunnel):"
Write-Host "  cloudflared tunnel --url http://localhost:4174"
Write-Host "Option B (Local HTTPS cert):"
Write-Host "  Use mkcert and run Vite with HTTPS config."

Write-Host ""
Write-Host "=== Mobile test steps ==="
Write-Host "1) Open the HTTPS URL on phone."
Write-Host "2) Login as rep1."
Write-Host "3) Start a visit -> allow location -> confirm start."
Write-Host "4) End the visit -> confirm end."
Write-Host "5) Verify the debug panel shows lat/lng/accuracy/time."

@"
# GPS HTTPS Smoke Report (Fill In)

- Timestamp: $timestamp
- HTTPS method: [Cloudflare Tunnel | Local HTTPS cert]
- Phone/device: [model + OS]
- URL tested: [https://...]

## Results
- Backend reachable: [yes/no]
- PWA reachable: [yes/no]
- Login success: [yes/no]
- Start Visit GPS: [pass/fail]
- End Visit GPS: [pass/fail]
- Debug panel data: [present/missing]

## Notes
- [Any issues or observations]
"@ | Set-Content -Path $reportPath -Encoding UTF8

Write-Host ""
Write-Host "REPORT_PATH=$reportPath"
