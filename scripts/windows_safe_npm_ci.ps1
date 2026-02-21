param(
  [Parameter(Mandatory = $true)]
  [string]$AppPath,
  [string]$AppName = "ALQASEER-PWA",
  [string]$RunDir,
  [string]$LogsDir,
  [int]$MaxRetries = 4,
  [int]$InitialBackoffSeconds = 2,
  [string[]]$AdditionalNpmCommands = @()
)

$ErrorActionPreference = "Stop"
# In PowerShell 7+, native stderr can be promoted to terminating errors when this
# preference is enabled globally. Keep npm warnings non-fatal and rely on exit codes.
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

function Resolve-FullPath {
  param([string]$PathValue)
  return [System.IO.Path]::GetFullPath($PathValue)
}

function Test-IsUnderPath {
  param(
    [string]$ParentPath,
    [string]$CandidatePath
  )
  $parentFull = (Resolve-FullPath -PathValue $ParentPath).TrimEnd('\', '/')
  $candidateFull = Resolve-FullPath -PathValue $CandidatePath
  return $candidateFull.StartsWith("$parentFull\", [System.StringComparison]::OrdinalIgnoreCase)
}

function Remove-SafeTempPath {
  param(
    [string]$PathToRemove,
    [string]$TempRoot
  )

  if (-not (Test-Path $PathToRemove)) {
    return
  }

  if (-not (Test-IsUnderPath -ParentPath $TempRoot -CandidatePath $PathToRemove)) {
    throw "Refusing to clean non-temp path: $PathToRemove"
  }

  try {
    Remove-Item -Path $PathToRemove -Recurse -Force -ErrorAction Stop
  } catch {
    & cmd.exe /d /c "rd /s /q ""$PathToRemove""" | Out-Null
  }
}

function Invoke-NpmCommand {
  param(
    [string]$CommandText,
    [string]$WorkingDirectory,
    [string]$LogFile
  )

  "[$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")] CMD: $CommandText" | Tee-Object -FilePath $LogFile -Append | Out-Null

  $stdoutTemp = Join-Path $env:TEMP ("safe_npm_stdout_{0}.log" -f ([System.Guid]::NewGuid().ToString("N")))
  $stderrTemp = Join-Path $env:TEMP ("safe_npm_stderr_{0}.log" -f ([System.Guid]::NewGuid().ToString("N")))
  try {
    $wrapped = "$CommandText 1>""$stdoutTemp"" 2>""$stderrTemp"""
    Push-Location $WorkingDirectory
    try {
      & cmd.exe /d /s /c $wrapped
      $exitCode = $LASTEXITCODE
    } finally {
      Pop-Location
    }

    $combinedLines = @()
    if (Test-Path $stdoutTemp) {
      $combinedLines += (Get-Content $stdoutTemp -ErrorAction SilentlyContinue)
    }
    if (Test-Path $stderrTemp) {
      $combinedLines += (Get-Content $stderrTemp -ErrorAction SilentlyContinue)
    }
    $combinedLines = $combinedLines | Where-Object { $_ -and $_.Trim().Length -gt 0 }
    if ($combinedLines) {
      $combinedLines | Tee-Object -FilePath $LogFile -Append
    }

    return @{
      ExitCode = $exitCode
      Output = ($combinedLines -join "`n")
    }
  } finally {
    if (Test-Path $stdoutTemp) { Remove-Item -Force $stdoutTemp -ErrorAction SilentlyContinue }
    if (Test-Path $stderrTemp) { Remove-Item -Force $stderrTemp -ErrorAction SilentlyContinue }
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$appSource = if ([System.IO.Path]::IsPathRooted($AppPath)) { $AppPath } else { Join-Path $repoRoot $AppPath }
$appSource = Resolve-FullPath -PathValue $appSource
if (-not (Test-Path $appSource)) {
  Write-Error "App path not found: $appSource"
  exit 1
}

if (-not $LogsDir) {
  if ($RunDir) {
    $LogsDir = Join-Path $RunDir "logs"
  } else {
    $LogsDir = Join-Path $repoRoot "docs/_runs/manual/logs"
  }
}
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

$tempRootBase = if ($RunDir) {
  Join-Path $RunDir "artifacts/_tmp"
} else {
  Join-Path $env:TEMP "dopamine-crm-safe-npm-ci"
}
New-Item -ItemType Directory -Force -Path $tempRootBase | Out-Null

$safeAppName = ($AppName -replace '[^A-Za-z0-9._-]', '_')
$tempWorkspace = Join-Path $tempRootBase $safeAppName
$tempSharedPath = Join-Path $tempRootBase "shared"
$logPath = Join-Path $LogsDir ("windows_safe_npm_ci_{0}.log" -f $safeAppName)

$npmCommands = @(
  "npm ci --omit=dev"
) + $AdditionalNpmCommands

for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
  "=== Attempt $attempt/$MaxRetries for $AppName ===" | Tee-Object -FilePath $logPath -Append

  Remove-SafeTempPath -PathToRemove $tempWorkspace -TempRoot $tempRootBase
  New-Item -ItemType Directory -Force -Path $tempWorkspace | Out-Null

  $null = & robocopy $appSource $tempWorkspace /E /XD node_modules /NFL /NDL /NJH /NJS /NP
  $copyExitCode = $LASTEXITCODE
  if ($copyExitCode -gt 7) {
    "Robocopy failed with exit code $copyExitCode." | Tee-Object -FilePath $logPath -Append
    if ($attempt -eq $MaxRetries) {
      exit 1
    }
    $wait = [Math]::Max($InitialBackoffSeconds, 1) * [Math]::Pow(2, $attempt - 1)
    Start-Sleep -Seconds ([int]$wait)
    continue
  }

  # Preserve repo-relative shared tokens path used by some PWA CSS imports.
  $repoSharedPath = Join-Path $repoRoot "shared"
  if (Test-Path $repoSharedPath) {
    Remove-SafeTempPath -PathToRemove $tempSharedPath -TempRoot $tempRootBase
    $null = & robocopy $repoSharedPath $tempSharedPath /E /NFL /NDL /NJH /NJS /NP
    $sharedCopyExitCode = $LASTEXITCODE
    if ($sharedCopyExitCode -gt 7) {
      "Robocopy shared/ failed with exit code $sharedCopyExitCode." | Tee-Object -FilePath $logPath -Append
      if ($attempt -eq $MaxRetries) {
        exit 1
      }
      $wait = [Math]::Max($InitialBackoffSeconds, 1) * [Math]::Pow(2, $attempt - 1)
      Start-Sleep -Seconds ([int]$wait)
      continue
    }
  }

  $hadEpermUnlink = $false
  $hadFailure = $false
  foreach ($command in $npmCommands) {
    $cmdResult = Invoke-NpmCommand -CommandText $command -WorkingDirectory $tempWorkspace -LogFile $logPath
    if ($cmdResult.ExitCode -ne 0) {
      $hadFailure = $true
      if ($cmdResult.Output -match 'EPERM' -and $cmdResult.Output -match 'unlink') {
        $hadEpermUnlink = $true
      }
      break
    }
  }

  if (-not $hadFailure) {
    "PWA temp-workspace checks completed successfully." | Tee-Object -FilePath $logPath -Append
    exit 0
  }

  if ($hadEpermUnlink -and $attempt -lt $MaxRetries) {
    "Detected EPERM unlink. Retrying after temp-only aggressive cleanup." | Tee-Object -FilePath $logPath -Append
    Remove-SafeTempPath -PathToRemove $tempWorkspace -TempRoot $tempRootBase
    $wait = [Math]::Max($InitialBackoffSeconds, 1) * [Math]::Pow(2, $attempt - 1)
    Start-Sleep -Seconds ([int]$wait)
    continue
  }

  if (-not $hadEpermUnlink) {
    "Failure was not EPERM unlink; no retry cleanup outside normal attempt flow." | Tee-Object -FilePath $logPath -Append
  }

  exit 1
}

exit 1
