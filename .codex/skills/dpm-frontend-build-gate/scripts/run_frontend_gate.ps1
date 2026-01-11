param(
  [string]$RepoRoot = "",
  [string]$Timestamp = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../../..")).Path
}
if ([string]::IsNullOrWhiteSpace($Timestamp)) {
  $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
}

$runDir = Join-Path $RepoRoot "docs/_runs"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$windowsScript = Join-Path $PSScriptRoot "windows_build.ps1"
$dockerScript = Join-Path $PSScriptRoot "docker_build.ps1"
$wslScript = Join-Path $PSScriptRoot "wsl_build.ps1"

$windowsJson = & $windowsScript -RepoRoot $RepoRoot -Timestamp $Timestamp
$windowsResult = $windowsJson | ConvertFrom-Json

$dockerResult = $null
$wslResult = $null

if ($windowsResult.spawnBlocked -eq $true) {
  $dockerJson = & $dockerScript -RepoRoot $RepoRoot -Timestamp $Timestamp
  $dockerResult = $dockerJson | ConvertFrom-Json

  if (($dockerResult.frontendExit -ne 0) -or ($dockerResult.pwaExit -ne 0)) {
    if (Test-Path $wslScript) {
      $wslJson = & $wslScript -RepoRoot $RepoRoot -Timestamp $Timestamp
      $wslResult = $wslJson | ConvertFrom-Json
    }
  }
}

$bestPath = "windows"
if ($windowsResult.spawnBlocked -eq $true) {
  $bestPath = "none"
  if ($dockerResult -and $dockerResult.frontendExit -eq 0 -and $dockerResult.pwaExit -eq 0) {
    $bestPath = "docker"
  } elseif ($wslResult -and $wslResult.frontendExit -eq 0 -and $wslResult.pwaExit -eq 0) {
    $bestPath = "wsl"
  }
}

$reportPath = Join-Path $runDir ("frontend_gate_{0}.md" -f $Timestamp)
@"
# Frontend Build Gate Report

Timestamp: $Timestamp

## Windows run
- spawnBlocked: $($windowsResult.spawnBlocked)
- CRM/frontend exit: $($windowsResult.frontendExit)
- ALQASEER-PWA exit: $($windowsResult.pwaExit)
- logs:
  - $($windowsResult.logFrontend)
  - $($windowsResult.logPwa)

## Docker run
$(if ($dockerResult) {
"- CRM/frontend exit: $($dockerResult.frontendExit)
- ALQASEER-PWA exit: $($dockerResult.pwaExit)
- logs:
  - $($dockerResult.logFrontend)
  - $($dockerResult.logPwa)"} else {"- not attempted"})

## WSL run
$(if ($wslResult) {
"- CRM/frontend exit: $($wslResult.frontendExit)
- ALQASEER-PWA exit: $($wslResult.pwaExit)
- logs:
  - $($wslResult.logFrontend)
  - $($wslResult.logPwa)"} else {"- not attempted"})

## Best working path
- $bestPath
"@ | Set-Content -Path $reportPath -Encoding ASCII

@{ report = $reportPath } | ConvertTo-Json -Compress
