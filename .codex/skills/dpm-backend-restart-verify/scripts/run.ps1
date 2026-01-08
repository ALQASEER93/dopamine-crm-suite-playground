$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
if (-not (Test-Path (Join-Path $repoRoot '.git'))) {
  throw "Repo root not found from $PSScriptRoot"
}

$runDir = Join-Path $repoRoot 'docs/_runs'
if (-not (Test-Path $runDir)) {
  New-Item -ItemType Directory -Path $runDir | Out-Null
}

$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$logPath = Join-Path $runDir "backend_${ts}.log"
$errPath = Join-Path $runDir "backend_${ts}.err.log"
$versionPath = Join-Path $runDir "server_version_${ts}.json"

# Stop only the process bound to port 8000.
$connections = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
$stopPids = @()
if ($connections) {
  $stopPids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
}
foreach ($stopPid in $stopPids) {
  if ($stopPid -and (Get-Process -Id $stopPid -ErrorAction SilentlyContinue)) {
    Stop-Process -Id $stopPid -Force
  }
}

$backendDir = Join-Path $repoRoot 'CRM/backend'
if (-not (Test-Path $backendDir)) {
  throw "Backend directory not found at $backendDir"
}

$devScripts = @(
  (Join-Path $backendDir 'scripts/dev.ps1'),
  (Join-Path $backendDir 'scripts/run_dev.ps1'),
  (Join-Path $backendDir 'scripts/start_dev.ps1'),
  (Join-Path $backendDir 'scripts/run.ps1'),
  (Join-Path $backendDir 'scripts/start.ps1')
)
$devScript = $devScripts | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($devScript) {
  Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$devScript`"" -WorkingDirectory $backendDir -RedirectStandardOutput $logPath -RedirectStandardError $errPath -WindowStyle Hidden | Out-Null
} else {
  Start-Process -FilePath "python" -ArgumentList "-m uvicorn main:app --host 127.0.0.1 --port 8000" -WorkingDirectory $backendDir -RedirectStandardOutput $logPath -RedirectStandardError $errPath -WindowStyle Hidden | Out-Null
}

$deadline = (Get-Date).AddSeconds(60)
$version = $null
while ((Get-Date) -lt $deadline) {
  try {
    $version = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/v1/meta/version' -TimeoutSec 5
    if ($version) {
      $version | ConvertTo-Json -Depth 6 | Set-Content -Path $versionPath -Encoding UTF8
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (-not $version) {
  throw "Backend did not respond on http://127.0.0.1:8000/api/v1/meta/version"
}

Write-Output $versionPath
Write-Output $logPath
Write-Output $errPath
