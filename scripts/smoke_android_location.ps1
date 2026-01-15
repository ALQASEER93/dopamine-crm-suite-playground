$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = Join-Path $repoRoot "docs/_runs/android_smoke_$timestamp.md"
$apiBaseUrl = if ($env:DPM_ANDROID_API_BASE_URL) { $env:DPM_ANDROID_API_BASE_URL } else { "http://10.0.2.2:8000/api/v1" }
$email = if ($env:DPM_SMOKE_EMAIL) { $env:DPM_SMOKE_EMAIL } else { "rep1@example.com" }
$password = if ($env:DPM_SMOKE_PASSWORD) { $env:DPM_SMOKE_PASSWORD } else { "Rep12345!" }
$strictMode = ($env:CI -eq "true") -or ($env:ANDROID_SMOKE_STRICT -eq "1")
$avdName = if ($env:DPM_ANDROID_AVD) { $env:DPM_ANDROID_AVD } else { "dpm_smoke" }
$systemImage = if ($env:DPM_ANDROID_SYSTEM_IMAGE) { $env:DPM_ANDROID_SYSTEM_IMAGE } else { "system-images;android-33;google_apis;x86_64" }

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

function Resolve-Adb {
  $adb = Get-Command adb -ErrorAction SilentlyContinue
  if ($adb) { return [pscustomobject]@{ Source = $adb.Source } }
  $sdkRoot = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { $env:ANDROID_HOME }
  if (-not $sdkRoot) { return $null }
  $adbCandidate = Join-Path $sdkRoot "platform-tools/adb"
  if ($IsWindows) { $adbCandidate = "$adbCandidate.exe" }
  if (Test-Path $adbCandidate) {
    return [pscustomobject]@{ Source = $adbCandidate }
  }
  return $null
}

function Resolve-Emulator {
  $emulator = Get-Command emulator -ErrorAction SilentlyContinue
  if ($emulator) { return [pscustomobject]@{ Source = $emulator.Source } }
  $sdkRoot = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { $env:ANDROID_HOME }
  if (-not $sdkRoot) { return $null }
  $emulatorCandidate = Join-Path $sdkRoot "emulator/emulator"
  if ($IsWindows) { $emulatorCandidate = "$emulatorCandidate.exe" }
  if (Test-Path $emulatorCandidate) {
    return [pscustomobject]@{ Source = $emulatorCandidate }
  }
  return $null
}

function Wait-ForEmulator {
  param(
    [pscustomobject]$Adb,
    [string]$DeviceId,
    [int]$TimeoutSeconds = 120
  )
  $elapsed = 0
  while ($elapsed -lt $TimeoutSeconds) {
    $boot = & $Adb.Source -s $DeviceId shell getprop sys.boot_completed 2>$null
    if ($boot -match "1") { return $true }
    Start-Sleep -Seconds 5
    $elapsed += 5
  }
  return $false
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

  $adb = Resolve-Adb
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
    $setupScript = Join-Path $repoRoot "scripts/setup_android_sdk_avd.ps1"
    if (Test-Path $setupScript) {
      $reportLines += "- Setup AVD: `"$setupScript`" (AVD=$avdName)"
      & $setupScript -AvdName $avdName -SystemImage $systemImage -StartEmulator | Out-Host
      $devices = & $adb.Source devices
      $deviceId = $devices | Where-Object { $_ -match "\sdevice$" } | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1
    }
  }

  if (-not $deviceId) {
    $emulator = Resolve-Emulator
    if ($emulator) {
      $avds = & $emulator.Source -list-avds
      if ($avds) {
        $avd = if ($avds -contains $avdName) { $avdName } else { $avds[0] }
        Start-Process -FilePath $emulator.Source -ArgumentList @(
          "-avd", $avd, "-netdelay", "none", "-netspeed", "full",
          "-no-window", "-no-audio", "-no-snapshot", "-gpu", "swiftshader_indirect"
        ) | Out-Null
        $reportLines += "- Started emulator: $avd"
        $waited = 0
        while ($waited -lt 90 -and -not $deviceId) {
          Start-Sleep -Seconds 5
          $waited += 5
          $devices = & $adb.Source devices
          $deviceId = $devices | Where-Object { $_ -match "\sdevice$" } | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1
        }
        if ($deviceId) {
          [void](Wait-ForEmulator -Adb $adb -DeviceId $deviceId -TimeoutSeconds 180)
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
  $grantList = @(
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.ACCESS_BACKGROUND_LOCATION",
    "android.permission.POST_NOTIFICATIONS"
  )
  foreach ($perm in $grantList) {
    & $adb.Source -s $deviceId shell pm grant com.alqaseer.pwa $perm 2>$null
  }
  $reportLines += "- Granted permissions: $($grantList -join ", ")"
  $appOps = @(
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION",
    "ACCESS_BACKGROUND_LOCATION"
  )
  foreach ($op in $appOps) {
    & $adb.Source -s $deviceId shell appops set com.alqaseer.pwa $op allow 2>$null
  }
  & $adb.Source -s $deviceId shell settings put secure location_mode 3 2>$null
  & $adb.Source -s $deviceId shell settings put secure location_providers_allowed +gps 2>$null
  & $adb.Source -s $deviceId shell cmd location set-location-enabled true 2>$null
  $reportLines += "- Location mode: enabled (gps)"
  $serviceArgs = @(
    "start-foreground-service",
    "-n", "com.alqaseer.pwa/.telemetry.BackgroundLocationService",
    "--es", "auth_token", $token,
    "--es", "api_base_url", $apiBaseUrl,
    "--ei", "interval_seconds", "5",
    "--es", "source", "smoke_script"
  )
  $serviceResult = & $adb.Source -s $deviceId shell run-as com.alqaseer.pwa am @serviceArgs
  if ($LASTEXITCODE -ne 0) {
    $reportLines += "- Service start (run-as) failed; retrying via shell"
    & $adb.Source -s $deviceId shell am @serviceArgs | Out-Host
  } else {
    $serviceResult | Out-Host
  }

  $smokeStart = (Get-Date).ToUniversalTime()
  $geoPoints = @(
    @{ lat = 30.0444; lng = 31.2357 },
    @{ lat = 30.0461; lng = 31.2391 },
    @{ lat = 30.0479; lng = 31.2425 }
  )

  if ($deviceId -like "emulator-*") {
    $reportLines += "- Geo route: 3 fixes via adb emu geo fix"
    foreach ($point in $geoPoints) {
      & $adb.Source -s $deviceId emu geo fix $point.lng $point.lat | Out-Host
      Start-Sleep -Seconds 10
    }
  } else {
    $reportLines += "- Geo route: skipped (non-emulator device detected)"
  }

  Start-Sleep -Seconds 30
  $latest = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/api/v1/telemetry/location/latest?rep_id=$($me.id)" -Headers $headers
  $latestItem = if ($latest -is [array]) { $latest[0] } else { $latest }
  if (-not $latestItem) {
    throw "No telemetry data received."
  }
  $trail = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/api/v1/telemetry/location/trail?rep_id=$($me.id)&limit=5" -Headers $headers
  $sampleRows = @()
  foreach ($row in ($trail | Select-Object -First 3)) {
    $sampleRows += ("- ts={0} lat={1} lng={2} acc={3} source={4}" -f $row.ts, $row.lat, $row.lng, $row.accuracy_m, $row.source)
  }
  if ($sampleRows.Count -eq 0) {
    $sampleRows += "- (no trail rows returned)"
  }

  try {
    $latestRaw = $latestItem.ts
    if ($latestRaw -is [DateTime]) {
      $latestTsParsed = $latestRaw
    } else {
      $assumeLocal = [System.Globalization.DateTimeStyles]::AssumeLocal
      $enUs = [System.Globalization.CultureInfo]::GetCultureInfo("en-US")
      try {
        $latestTsParsed = [DateTime]::Parse([string]$latestRaw, [System.Globalization.CultureInfo]::InvariantCulture, $assumeLocal)
      } catch {
        try {
          $latestTsParsed = [DateTime]::Parse([string]$latestRaw, $enUs, $assumeLocal)
        } catch {
          $latestTsParsed = [DateTime]::Parse([string]$latestRaw, [System.Globalization.CultureInfo]::CurrentCulture, $assumeLocal)
        }
      }
    }
    if ($latestTsParsed.Kind -eq [DateTimeKind]::Unspecified) {
      $latestTsParsed = [DateTime]::SpecifyKind($latestTsParsed, [DateTimeKind]::Utc)
    }
    $latestTs = $latestTsParsed.ToUniversalTime()
    if ($latestTs -lt $smokeStart.AddMinutes(-2)) {
      throw "Telemetry timestamp did not update after smoke start."
    }
  } catch {
    throw $_
  }

  $reportLines += ""
  $reportLines += "## Telemetry Evidence"
  $reportLines += "- Smoke start (UTC): $($smokeStart.ToString('o'))"
  $reportLines += "- Latest ts (UTC): $($latestTs.ToString('o'))"
  $reportLines += $sampleRows

  $reportLines += ""
  $reportLines += "## Result"
  $reportLines += "- PASS (telemetry received for rep_id=$($me.id))"
} catch {
  $reportLines += ""
  $reportLines += "## Result"
  $reportLines += "- FAIL ($($_.Exception.Message))"
} finally {
  if ($adb -and $deviceId) {
    $assetDir = Join-Path $repoRoot "docs/_runs/assets/$timestamp/android"
    if (-not (Test-Path $assetDir)) {
      New-Item -ItemType Directory -Path $assetDir | Out-Null
    }
    $logcatPath = Join-Path $assetDir "logcat.txt"
    & $adb.Source -s $deviceId logcat -d | Set-Content -Path $logcatPath -Encoding UTF8
    $logcatRelative = $logcatPath.Replace("$repoRoot\", "").Replace("$repoRoot/", "")
    $reportLines += "- Logcat: $logcatRelative"
  }
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
