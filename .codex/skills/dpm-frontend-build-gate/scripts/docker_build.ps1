param(
  [string]$RepoRoot,
  [string]$Timestamp
)

$ErrorActionPreference = "Stop"

$runDir = Join-Path $RepoRoot "docs/_runs"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$logFrontend = Join-Path $runDir ("docker_build_frontend_{0}.log" -f $Timestamp)
$logPwa = Join-Path $runDir ("docker_build_pwa_{0}.log" -f $Timestamp)

$dockerInfo = & docker info 2>$null
if ($LASTEXITCODE -ne 0) {
  @{
    platform = "docker"
    frontendExit = 1
    pwaExit = 1
    logFrontend = $logFrontend
    logPwa = $logPwa
    error = "docker-daemon-not-running"
  } | ConvertTo-Json -Compress
  exit 0
}

$frontendCmd = "cd /repo/CRM/frontend && npm ci && npm test --if-present && npm run build"
$pwaCmd = "cd /repo/ALQASEER-PWA && npm ci && npm run build"

$repoMount = "{0}:/repo" -f $RepoRoot
$frontendNodeModulesVolume = "dpm_frontend_node_modules"
$pwaNodeModulesVolume = "dpm_pwa_node_modules"

$dockerFrontendArgs = @(
  "run",
  "--rm",
  "-v", $repoMount,
  "-v", "{0}:/repo/CRM/frontend/node_modules" -f $frontendNodeModulesVolume,
  "-w", "/repo",
  "node:20-bullseye",
  "/bin/bash",
  "-lc",
  $frontendCmd
)

$dockerPwaArgs = @(
  "run",
  "--rm",
  "-v", $repoMount,
  "-v", "{0}:/repo/ALQASEER-PWA/node_modules" -f $pwaNodeModulesVolume,
  "-w", "/repo",
  "node:20-bullseye",
  "/bin/bash",
  "-lc",
  $pwaCmd
)

& docker @dockerFrontendArgs 2>&1 | Tee-Object -FilePath $logFrontend
$frontendExit = $LASTEXITCODE

& docker @dockerPwaArgs 2>&1 | Tee-Object -FilePath $logPwa
$pwaExit = $LASTEXITCODE

@{
  platform = "docker"
  frontendExit = $frontendExit
  pwaExit = $pwaExit
  logFrontend = $logFrontend
  logPwa = $logPwa
} | ConvertTo-Json -Compress
