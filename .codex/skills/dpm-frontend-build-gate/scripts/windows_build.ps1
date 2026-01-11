param(
  [string]$RepoRoot,
  [string]$Timestamp
)

$ErrorActionPreference = "Stop"

$runDir = Join-Path $RepoRoot "docs/_runs"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$logFrontend = Join-Path $runDir ("windows_build_frontend_{0}.log" -f $Timestamp)
$logPwa = Join-Path $runDir ("windows_build_pwa_{0}.log" -f $Timestamp)

$frontendCmd = "cd /d \"$RepoRoot\CRM\frontend\" && npm ci && npm test --if-present && npm run build"
$pwaCmd = "cd /d \"$RepoRoot\ALQASEER-PWA\" && npm ci && npm run build"

cmd /c $frontendCmd 2>&1 | Tee-Object -FilePath $logFrontend
$frontendExit = $LASTEXITCODE

cmd /c $pwaCmd 2>&1 | Tee-Object -FilePath $logPwa
$pwaExit = $LASTEXITCODE

$spawnBlocked = $false
$logText = @()
if (Test-Path $logFrontend) { $logText += Get-Content -Path $logFrontend }
if (Test-Path $logPwa) { $logText += Get-Content -Path $logPwa }
if ($logText -match "EPERM") { $spawnBlocked = $true }

@{
  platform = "windows"
  frontendExit = $frontendExit
  pwaExit = $pwaExit
  spawnBlocked = $spawnBlocked
  logFrontend = $logFrontend
  logPwa = $logPwa
} | ConvertTo-Json -Compress
