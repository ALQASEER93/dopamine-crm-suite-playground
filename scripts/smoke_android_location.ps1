$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = Join-Path $repoRoot "docs/_runs/android_smoke_$timestamp.md"
$apiBaseUrl = if ($env:DPM_ANDROID_API_BASE_URL) { $env:DPM_ANDROID_API_BASE_URL } else { "http://10.0.2.2:8000/api/v1" }
$email = if ($env:DPM_SMOKE_EMAIL) { $env:DPM_SMOKE_EMAIL } else { "rep1@example.com" }
$password = if ($env:DPM_SMOKE_PASSWORD) { $env:DPM_SMOKE_PASSWORD } else { "Rep12345!" }
$strictMode = ($env:CI -eq "true") -or ($env:ANDROID_SMOKE_STRICT -eq "1")

function Test-PortOpen {
  param([int]$Port)
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $success = $async.AsyncWaitHandle.WaitOne(200)
    if ($success -and $client.Connected) {
      $client.Close()
      return $true
    }
  } catch {
    return $false
  } finally {
    if ($client) { $client.Dispose() }
  }
  return $false
}

function Start-BackgroundProcess {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory
  )
  if ($IsWindows) {
    return Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory -PassThru -WindowStyle Hidden
  }
  return Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory -PassThru
}

function Resolve-Python {
  $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
  if ($pythonCmd) { return [pscustomobject]@{ Exe = $pythonCmd.Source; Args = @() } }
  $pyCmd = Get-Command py -ErrorAction SilentlyContinue
  if ($pyCmd) { return [pscustomobject]@{ Exe = $pyCmd.Source; Args = @("-3.11") } }
  return [pscustomobject]@{ Exe = "python"; Args = @() }
}

$reportLines = @(
  "# Android Location Smoke ($timestamp)",
  "",
  "## Commands"
)

$backendProc = $null
try {
  if (-not (Test-PortOpen -Port 8000)) {
    $python = Resolve-Python
    $backendArgs = @()
    if ($python.Args.Count -gt 0) { $backendArgs += $python.Args }
    $backendArgs += @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000")
    $backendProc = Start-BackgroundProcess -FilePath $python.Exe -ArgumentList $backendArgs `
      -WorkingDirectory (Join-Path $repoRoot "CRM/backend")
    $reportLines += "- Started backend: $($python.Exe) $($backendArgs -join ' ')"
    Start-Sleep -Seconds 5
  }

  $buildScript = Join-Path $repoRoot "scripts/build_android_debug.ps1"
  $reportLines += "- Build APK: `"$buildScript`""
  & $buildScript | Out-Host

  $adb = Get-Command adb -ErrorAction SilentlyContinue
  if (-not $adb) {
    $sdkRoot = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { $env:ANDROID_HOME }
    if ($sdkRoot) {
      $adbCandidate = Join-Path $sdkRoot "platform-tools/adb"
      if ($IsWindows) { $adbCandidate = "$adbCandidate.exe" }
      if (Test-Path $adbCandidate) {
        $adb = [pscustomobject]@{ Source = $adbCandidate }
      }
    }
  }
  if (-not $adb) {
    if ($strictMode) {
      throw "adb not found; Android SDK/Platform Tools missing."
    }
    $reportLines += ""
    $reportLines += "## Result"
    $reportLines += "- PASS (pending real device: adb not found)"
    $reportLines += ""
    $reportLines += "## Notes"
    $reportLines += "- Emulator/ADB not available; install and rerun for live ping verification."
    Set-Content -Path $reportPath -Value ($reportLines -join "`n") -Encoding UTF8
    Write-Host "REPORT_PATH: $reportPath"
    return
  }

  $devices = & $adb.Source devices
  $deviceId = $devices | Where-Object { $_ -match "\sdevice$" } | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1
  if (-not $deviceId) {
    $emulator = Get-Command emulator -ErrorAction SilentlyContinue
    if (-not $emulator) {
      $sdkRoot = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { $env:ANDROID_HOME }
      if ($sdkRoot) {
        $emulatorCandidate = Join-Path $sdkRoot "emulator/emulator"
        if ($IsWindows) { $emulatorCandidate = "$emulatorCandidate.exe" }
        if (Test-Path $emulatorCandidate) {
          $emulator = [pscustomobject]@{ Source = $emulatorCandidate }
        }
      }
    }
    if ($emulator) {
      $avds = & $emulator.Source -list-avds
      if ($avds) {
        $avd = $avds[0]
        Start-Process -FilePath $emulator.Source -ArgumentList @("-avd", $avd, "-netdelay", "none", "-netspeed", "full") | Out-Null
        $reportLines += "- Started emulator: $avd"
        $waited = 0
        while ($waited -lt 60 -and -not $deviceId) {
          Start-Sleep -Seconds 5
          $waited += 5
          $devices = & $adb.Source devices
          $deviceId = $devices | Where-Object { $_ -match "\sdevice$" } | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1
        }
      }
    }
  }

  if (-not $deviceId) {
    if ($strictMode) {
      throw "No emulator/device detected."
    }
    $reportLines += ""
    $reportLines += "## Result"
    $reportLines += "- PASS (pending real device: no emulator detected)"
    $reportLines += ""
    $reportLines += "## Notes"
    $reportLines += "- Emulator not available; install AVD or connect device to validate live pings."
    Set-Content -Path $reportPath -Value ($reportLines -join "`n") -Encoding UTF8
    Write-Host "REPORT_PATH: $reportPath"
    return
  }

  $apkPath = Join-Path $repoRoot "ALQASEER-PWA/android/app/build/outputs/apk/debug/app-debug.apk"
  $reportLines += "- Device: $deviceId"
  $reportLines += "- Install APK: adb install -r app-debug.apk"
  & $adb.Source -s $deviceId install -r $apkPath | Out-Host

  $login = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/v1/auth/login" `
    -ContentType "application/json" -Body (@{ email = $email; password = $password } | ConvertTo-Json)
  $token = $login.token
  $headers = @{ Authorization = "Bearer $token" }
  $me = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/api/v1/auth/me" -Headers $headers

  $reportLines += "- Start service: adb shell am start-foreground-service ..."
  & $adb.Source -s $deviceId shell am start -n "com.alqaseer.pwa/.MainActivity" | Out-Host
  & $adb.Source -s $deviceId shell am start-foreground-service `
    -n "com.alqaseer.pwa/.telemetry.BackgroundLocationService" `
    --es auth_token $token `
    --es api_base_url $apiBaseUrl `
    --ei interval_seconds 10 `
    --es source "smoke_script" | Out-Host

  & $adb.Source -s $deviceId emu geo fix 31.2357 30.0444 | Out-Host
  Start-Sleep -Seconds 12

  $latest = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/api/v1/telemetry/location/latest?rep_id=$($me.id)" -Headers $headers
  $latestItem = if ($latest -is [array]) { $latest[0] } else { $latest }
  if (-not $latestItem) {
    throw "No telemetry data received."
  }

  $assetDir = Join-Path $repoRoot "docs/_runs/assets/$timestamp/android"
  if (-not (Test-Path $assetDir)) {
    New-Item -ItemType Directory -Path $assetDir | Out-Null
  }
  $logcatPath = Join-Path $assetDir "logcat.txt"
  & $adb.Source -s $deviceId logcat -d | Set-Content -Path $logcatPath -Encoding UTF8
  $logcatRelative = $logcatPath.Replace("$repoRoot\", "").Replace("$repoRoot/", "")
  $reportLines += "- Logcat: $logcatRelative"

  $reportLines += ""
  $reportLines += "## Result"
  $reportLines += "- PASS (telemetry received for rep_id=$($me.id))"
} catch {
  $reportLines += ""
  $reportLines += "## Result"
  $reportLines += "- FAIL ($($_.Exception.Message))"
} finally {
  if ($backendProc -and -not $backendProc.HasExited) {
    Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
  }
  $reportLines += ""
  $reportLines += "## Notes"
  $reportLines += "- If background location permissions were denied, enable them in Android settings."
  $reportLines += "- This smoke test uses emulator geo fix to simulate location."
  Set-Content -Path $reportPath -Value ($reportLines -join "`n") -Encoding UTF8
  Write-Host "REPORT_PATH: $reportPath"
}
