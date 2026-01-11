param(
  [string]$RepoRoot,
  [string]$Timestamp
)

$ErrorActionPreference = "Stop"

$runDir = Join-Path $RepoRoot "docs/_runs"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$logFrontend = Join-Path $runDir ("wsl_build_frontend_{0}.log" -f $Timestamp)
$logPwa = Join-Path $runDir ("wsl_build_pwa_{0}.log" -f $Timestamp)

$wslExe = Get-Command wsl.exe -ErrorAction SilentlyContinue
if (-not $wslExe) {
  @{
    platform = "wsl"
    frontendExit = 1
    pwaExit = 1
    logFrontend = $logFrontend
    logPwa = $logPwa
    error = "wsl-not-available"
  } | ConvertTo-Json -Compress
  exit 0
}

$drive = $RepoRoot.Substring(0,1).ToLowerInvariant()
$pathPart = $RepoRoot.Substring(2) -replace "\\", "/"
$repoLinux = "/mnt/$drive$pathPart"

$frontendCmd = "cd $repoLinux/CRM/frontend && npm ci && npm test --if-present && npm run build"
$pwaCmd = "cd $repoLinux/ALQASEER-PWA && npm ci && npm run build"

wsl.exe -e bash -lc $frontendCmd 2>&1 | Tee-Object -FilePath $logFrontend
$frontendExit = $LASTEXITCODE

wsl.exe -e bash -lc $pwaCmd 2>&1 | Tee-Object -FilePath $logPwa
$pwaExit = $LASTEXITCODE

@{
  platform = "wsl"
  frontendExit = $frontendExit
  pwaExit = $pwaExit
  logFrontend = $logFrontend
  logPwa = $logPwa
} | ConvertTo-Json -Compress
