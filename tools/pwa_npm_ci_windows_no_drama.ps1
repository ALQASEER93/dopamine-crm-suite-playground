param(
  [Parameter(Mandatory = $false)]
  [string]$ProjectDir = "ALQASEER-PWA",

  [Parameter(Mandatory = $true)]
  [string]$LogPath,

  [Parameter(Mandatory = $false)]
  [int]$MaxAttempts = 5,

  # If npm ci hangs (common on Windows with locked binaries), kill and retry.
  [Parameter(Mandatory = $false)]
  [int]$TimeoutMinutes = 20,

  # Only clean node_modules/package-lock.json after we positively detect the EPERM/esbuild signature.
  [Parameter(Mandatory = $false)]
  [switch]$CleanOnEperm = $false,

  [Parameter(Mandatory = $false)]
  [switch]$CleanPackageLock = $false
)

$ErrorActionPreference = "Stop"

function Write-LogLine {
  param([string]$Line)
  $ts = (Get-Date -Format "o")
  ($ts + " " + $Line) | Out-File -Append -Encoding utf8 $LogPath
}

function Try-TaskKill {
  param([string]$ImageName)
  try {
    cmd /c "taskkill /F /IM $ImageName /T" 2>&1 | Out-Null
  } catch {
    # ignore
  }
}

function Invoke-CmdAppendLog {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CmdLine,
    [Parameter(Mandatory = $true)]
    [string]$LogFile,
    [Parameter(Mandatory = $true)]
    [int]$TimeoutMins
  )

  # Use cmd redirection so output is appended incrementally while the process runs.
  $redirected = "$CmdLine >> `"$LogFile`" 2>>&1"
  $p = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $redirected) -PassThru -WindowStyle Hidden

  $timeoutMs = [Math]::Max(1, $TimeoutMins) * 60 * 1000
  $exited = $p.WaitForExit($timeoutMs)
  if (-not $exited) {
    try { $p.Kill($true) } catch { }
    return 124 # timeout
  }
  return $p.ExitCode
}

if (-not (Test-Path $ProjectDir)) {
  throw "ProjectDir not found: $ProjectDir"
}

New-Item -ItemType File -Force -Path $LogPath | Out-Null
Write-LogLine "START pwa_npm_ci_windows_no_drama ProjectDir=$ProjectDir MaxAttempts=$MaxAttempts TimeoutMinutes=$TimeoutMinutes CleanOnEperm=$CleanOnEperm CleanPackageLock=$CleanPackageLock"

Push-Location $ProjectDir
try {
  Write-LogLine "npm cache verify"
  $cacheExit = Invoke-CmdAppendLog -CmdLine "npm cache verify" -LogFile $LogPath -TimeoutMins $TimeoutMinutes
  Write-LogLine "npm cache verify exit=$cacheExit"

  $lastExit = 1
  $detectedEpermEsbuild = $false

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    Write-LogLine "--- attempt $attempt/$MaxAttempts ---"

    Try-TaskKill "node.exe"
    Try-TaskKill "esbuild.exe"
    Start-Sleep -Seconds 3

    if ($CleanOnEperm -and $detectedEpermEsbuild) {
      if (Test-Path "node_modules") {
        Write-LogLine "Cleaning node_modules due to detected EPERM unlink esbuild.exe"
        Remove-Item -Recurse -Force "node_modules"
      }

      if ($CleanPackageLock -and (Test-Path "package-lock.json")) {
        Write-LogLine "Cleaning package-lock.json due to detected EPERM unlink esbuild.exe (explicit flag)"
        Remove-Item -Force "package-lock.json"
      }
    }

    Write-LogLine "npm ci"
    $lastExit = Invoke-CmdAppendLog -CmdLine "npm ci" -LogFile $LogPath -TimeoutMins $TimeoutMinutes
    Write-LogLine "npm ci exit=$lastExit"

    if ($lastExit -eq 0) {
      Write-LogLine "SUCCESS"
      exit 0
    }

    if ($lastExit -eq 124) {
      Write-LogLine "Detected timeout running npm ci; will retry with taskkill+sleep and optional cleanup."
      $detectedEpermEsbuild = $true # allow optional cleanup if explicitly enabled
    }

    # Detect the common Windows flake:
    # EPERM: operation not permitted, unlink '...\\node_modules\\esbuild\\esbuild.exe'
    $text = (Get-Content -Raw $LogPath)
    $detectedEpermEsbuild = ($text -match "EPERM" -and $text -match "unlink" -and $text -match "esbuild\.exe")
    if ($detectedEpermEsbuild) {
      Write-LogLine "Detected EPERM/unlink/esbuild.exe signature; will retry with taskkill+sleep and optional cleanup."
    } else {
      Write-LogLine "No EPERM/unlink/esbuild.exe signature detected; will still retry with backoff."
    }

    $sleep = [Math]::Min(16, [Math]::Pow(2, ($attempt - 1)))
    Write-LogLine "Backoff sleep ${sleep}s"
    Start-Sleep -Seconds $sleep
  }

  Write-LogLine "FAILED after $MaxAttempts attempts; lastExit=$lastExit"
  exit $lastExit
} finally {
  Pop-Location
}
