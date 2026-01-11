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
$pythonInfoPath = Join-Path $runDir "backend_${ts}.python.txt"
$pidPath = Join-Path $runDir "backend_pid_${ts}.txt"
$pidLastPath = Join-Path $runDir "backend_pid_last.txt"
$controlLog = Join-Path $runDir "backend_restart_${ts}.control.log"

function Write-ControlLog {
  param([string]$Message)
  $stamp = (Get-Date).ToString('s')
  Add-Content -Path $controlLog -Value "[$stamp] $Message"
}

# Preflight: if backend already responds, skip restart.
$preflightVersion = $null
$preflightAttempts = @()
for ($i = 0; $i -lt 5; $i++) {
  try {
    $preflightVersion = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/v1/meta/version' -TimeoutSec 5 -ErrorAction Stop
    if ($preflightVersion) {
      $preflightVersion | ConvertTo-Json -Depth 6 | Set-Content -Path $versionPath -Encoding UTF8
      Write-ControlLog "PASS: backend already responding; skipping restart."
      Write-Output $versionPath
      Write-Output $controlLog
      exit 0
    }
  } catch {
    $preflightAttempts += $_.Exception.Message
    Start-Sleep -Seconds 2
  }
}
Write-ControlLog "Preflight failed; attempting restart."

# Preflight port check for port 8000.
$connections = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
$stopPids = @()
if ($connections) {
  $stopPids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
}
$lastPid = $null
if (Test-Path $pidLastPath) {
  $lastPid = (Get-Content -Path $pidLastPath -ErrorAction SilentlyContinue | Select-Object -First 1)
}
foreach ($stopPid in $stopPids) {
  $proc = Get-Process -Id $stopPid -ErrorAction SilentlyContinue
  if (-not $proc) { continue }
  $procName = $proc.Name
  $shouldStop = $false
  if ($procName -match 'python|uvicorn') { $shouldStop = $true }
  if ($lastPid -and ($stopPid -eq [int]$lastPid)) { $shouldStop = $true }
  if ($shouldStop) {
    Write-ControlLog "Stopping PID $stopPid ($procName) bound to port 8000."
    try {
      Stop-Process -Id $stopPid -Force -ErrorAction Stop
    } catch {
      $message = $_.Exception.Message
      if ($message -match 'Access is denied') {
        $actionable = "Run Codex from an elevated PowerShell once to stop PID $stopPid"
        Write-ControlLog $actionable
        Write-Error $actionable
        exit 1
      }
      throw
    }
  } else {
    Write-ControlLog "Port 8000 occupied by PID $stopPid ($procName); leaving it running."
  }
}

$backendDir = Join-Path $repoRoot 'CRM/backend'
if (-not (Test-Path $backendDir)) {
  throw "Backend directory not found at $backendDir"
}

$pythonExe = Join-Path $backendDir '.venv\Scripts\python.exe'
if (-not (Test-Path $pythonExe)) {
  Write-Error "Backend venv python not found at $pythonExe. Create the venv at CRM/backend/.venv first."
  exit 1
}
$pythonExe = (Get-Item -LiteralPath $pythonExe).FullName
$pythonArgs = @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000')
$proc = Start-Process -FilePath $pythonExe -ArgumentList $pythonArgs -WorkingDirectory $backendDir -RedirectStandardOutput $logPath -RedirectStandardError $errPath -WindowStyle Hidden -PassThru
Set-Content -Path $pidPath -Value $proc.Id -Encoding ASCII
Set-Content -Path $pidLastPath -Value $proc.Id -Encoding ASCII
Set-Content -Path $pythonInfoPath -Value ("pythonExe=" + $pythonExe + " argsPrefix=") -Encoding ASCII
Write-ControlLog "Started backend via venv python (PID $($proc.Id))."

$deadline = (Get-Date).AddSeconds(120)
$version = $null
$attempts = @()
while ((Get-Date) -lt $deadline) {
  try {
    $version = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/v1/meta/version' -TimeoutSec 5 -ErrorAction Stop
    if ($version) {
      $version | ConvertTo-Json -Depth 6 | Set-Content -Path $versionPath -Encoding UTF8
      break
    }
  } catch {
    $status = 'error'
    $message = $_.Exception.Message
    if ($message -match 'refused') { $status = 'connection refused' }
    elseif ($message -match 'timed out') { $status = 'timeout' }
    elseif ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $status = "http $([int]$_.Exception.Response.StatusCode)"
    }
    $attempts += ("{0} - {1}" -f (Get-Date).ToString('HH:mm:ss'), $status)
    Start-Sleep -Seconds 2
  }
}

if (-not $version) {
  $pidValue = $null
  if (Test-Path $pidPath) {
    $pidValue = (Get-Content -Path $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1)
  }
  $procStatus = 'unknown'
  if ($pidValue) {
    try {
      $procCheck = Get-Process -Id $pidValue -ErrorAction Stop
      $procStatus = "running ($($procCheck.Name))"
    } catch {
      $procStatus = 'exited'
    }
  }
  $portStatus = 'not listening'
  $portConn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($portConn) {
    $portPid = $portConn.OwningProcess
    $portProc = Get-Process -Id $portPid -ErrorAction SilentlyContinue
    if ($portProc) {
      $portStatus = "listening (PID $portPid, $($portProc.Name))"
    } else {
      $portStatus = "listening (PID $portPid)"
    }
  }
  Write-ControlLog "Health check failed after $($attempts.Count) attempts."
  Write-ControlLog "Process status: $procStatus"
  Write-ControlLog "Port 8000 status: $portStatus"
  $attempts | Set-Content -Path (Join-Path $runDir "backend_health_attempts_${ts}.txt") -Encoding ASCII
  throw "Backend did not respond on http://127.0.0.1:8000/api/v1/meta/version. Process: $procStatus. Port 8000: $portStatus. See $controlLog."
}

Write-Output $versionPath
Write-Output $logPath
Write-Output $errPath
if (Test-Path $pythonInfoPath) {
  Write-Output $pythonInfoPath
}
Write-Output $pidPath
Write-Output $controlLog
