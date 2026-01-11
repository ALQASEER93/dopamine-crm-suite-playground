param(
  [string]$RepoRoot,
  [string]$Timestamp
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$runDir = Join-Path $RepoRoot "docs/_runs"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$logFrontend = Join-Path $runDir ("windows_build_frontend_{0}.log" -f $Timestamp)
$logPwa = Join-Path $runDir ("windows_build_pwa_{0}.log" -f $Timestamp)

$frontendCmd = 'cd /d "{0}\CRM\frontend" && npm ci && npm run --silent test --if-present && npm run --silent build' -f $RepoRoot
$pwaCmd = 'cd /d "{0}\ALQASEER-PWA" && npm ci && npm run --silent build' -f $RepoRoot

$savedErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
cmd /c $frontendCmd 2>&1 | Tee-Object -FilePath $logFrontend | Out-Null
$frontendExit = $LASTEXITCODE

cmd /c $pwaCmd 2>&1 | Tee-Object -FilePath $logPwa | Out-Null
$pwaExit = $LASTEXITCODE
$ErrorActionPreference = $savedErrorAction

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
