$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = Join-Path $repoRoot "docs/_runs/verify_pack_$timestamp.md"
$env:VERIFY_PACK_TS = $timestamp
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000/api/v1"

function Quote-Arg {
  param([string]$Value)
  if ($Value -match "\s") { return "`"$Value`"" }
  return $Value
}

function Resolve-Python {
  $pythonExe = $null
  $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
  if ($pythonCmd) {
    $pythonExe = $pythonCmd.Source
  }
  $pythonArgs = @()
  if (-not $pythonExe) {
    $pyCmd = Get-Command py -ErrorAction SilentlyContinue
    if ($pyCmd) {
      $pythonExe = $pyCmd.Source
      $pythonArgs = @("-3.11")
    }
  }
  if (-not $pythonExe) {
    $pythonExe = "python"
  }
  return [pscustomobject]@{
    Exe = $pythonExe
    Args = $pythonArgs
  }
}

function Invoke-Step {
  param(
    [string]$Name,
    [string]$Command,
    [string]$WorkDir
  )

  Write-Host "Running $Name..."
  $result = [ordered]@{
    Name = $Name
    Command = $Command
    Status = "PASS"
    ExitCode = 0
  }

  Push-Location $WorkDir
  try {
    & cmd /c $Command | Out-Host
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      $result.Status = "FAIL"
      $result.ExitCode = $exitCode
    }
  } catch {
    $result.Status = "FAIL"
    $result.ExitCode = 1
    $result.Error = $_.Exception.Message
  } finally {
    Pop-Location
  }

  return $result
}

function Test-PortOpen {
  param([int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $conn
}

function Wait-ForPort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 30
  )
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    if (Test-PortOpen -Port $Port) { return $true }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Wait-ForHttp {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 30
  )
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { return $true }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  return $false
}

function Start-CloudflareTunnel {
  param(
    [string]$TargetUrl,
    [string]$LogPath
  )
  $cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
  if (-not $cloudflared) {
    return [pscustomobject]@{
      Status = "SKIP"
      Url = $null
      Message = "cloudflared not found"
      Process = $null
      Log = $LogPath
    }
  }

  $proc = Start-Process -FilePath $cloudflared.Source -ArgumentList @(
    "tunnel", "--url", $TargetUrl, "--no-autoupdate"
  ) -PassThru -NoNewWindow -RedirectStandardOutput $LogPath -RedirectStandardError $LogPath

  $tunnelUrl = $null
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt 25) {
    if (Test-Path $LogPath) {
      $content = Get-Content $LogPath -Raw -ErrorAction SilentlyContinue
      if ($content -match "https://[a-z0-9-]+\.trycloudflare\.com") {
        $tunnelUrl = $matches[0]
        break
      }
    }
    Start-Sleep -Milliseconds 500
  }

  return [pscustomobject]@{
    Status = if ($tunnelUrl) { "PASS" } else { "FAIL" }
    Url = $tunnelUrl
    Message = if ($tunnelUrl) { "tunnel ready" } else { "tunnel url not detected" }
    Process = $proc
    Log = $LogPath
  }
}

function Stop-BackgroundProcess {
  param([System.Diagnostics.Process]$Process)
  if ($Process -and -not $Process.HasExited) {
    Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
  }
}

function Compare-Visuals {
  param(
    [string]$CurrentDir,
    [string]$BaselineDir,
    [string]$DiffDir,
    [double]$MaxDiffRatio = 0.005
  )
  if (-not (Test-Path $CurrentDir)) {
    return [pscustomobject]@{
      Status = "FAIL"
      Message = "current screenshots not found"
      DiffFiles = @()
    }
  }

  if (-not (Test-Path $BaselineDir)) {
    New-Item -ItemType Directory -Path $BaselineDir | Out-Null
  }

  $currentFiles = Get-ChildItem -Path $CurrentDir -Filter *.png -File
  if (-not $currentFiles) {
    return [pscustomobject]@{
      Status = "FAIL"
      Message = "no screenshots to compare"
      DiffFiles = @()
    }
  }

  $baselineFiles = Get-ChildItem -Path $BaselineDir -Filter *.png -File
  if (-not $baselineFiles) {
    foreach ($file in $currentFiles) {
      Copy-Item -Path $file.FullName -Destination (Join-Path $BaselineDir $file.Name) -Force
    }
    return [pscustomobject]@{
      Status = "PASS"
      Message = "baseline created"
      DiffFiles = @()
    }
  }

  Add-Type -AssemblyName System.Drawing
  if (-not (Test-Path $DiffDir)) {
    New-Item -ItemType Directory -Path $DiffDir | Out-Null
  }

  $failed = $false
  $diffFiles = @()

  foreach ($file in $currentFiles) {
    $baselinePath = Join-Path $BaselineDir $file.Name
    if (-not (Test-Path $baselinePath)) {
      $failed = $true
      continue
    }

    $baselineBmp = [System.Drawing.Bitmap]::FromFile($baselinePath)
    $currentBmp = [System.Drawing.Bitmap]::FromFile($file.FullName)
    $diffBmp = $null
    try {
      if ($baselineBmp.Width -ne $currentBmp.Width -or $baselineBmp.Height -ne $currentBmp.Height) {
        $failed = $true
        continue
      }

      $width = $baselineBmp.Width
      $height = $baselineBmp.Height
      $totalPixels = $width * $height
      $diffPixels = 0
      $diffBmp = New-Object System.Drawing.Bitmap($width, $height)

      for ($y = 0; $y -lt $height; $y++) {
        for ($x = 0; $x -lt $width; $x++) {
          $basePixel = $baselineBmp.GetPixel($x, $y)
          $currPixel = $currentBmp.GetPixel($x, $y)
          if ($basePixel.ToArgb() -ne $currPixel.ToArgb()) {
            $diffPixels++
            $diffBmp.SetPixel($x, $y, [System.Drawing.Color]::Red)
          } else {
            $diffBmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
          }
        }
      }

      if ($diffPixels -gt 0) {
        $diffPath = Join-Path $DiffDir $file.Name
        $diffBmp.Save($diffPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $diffFiles += $diffPath
      }

      $diffRatio = if ($totalPixels -gt 0) { $diffPixels / $totalPixels } else { 0 }
      if ($diffRatio -gt $MaxDiffRatio) {
        $failed = $true
      }
    } finally {
      $baselineBmp.Dispose()
      $currentBmp.Dispose()
      if ($diffBmp) { $diffBmp.Dispose() }
    }
  }

  return [pscustomobject]@{
    Status = if ($failed) { "FAIL" } else { "PASS" }
    Message = if ($failed) { "diff threshold exceeded" } else { "within threshold" }
    DiffFiles = $diffFiles
  }
}

function Invoke-RealDeviceGpsCheck {
  param(
    [string]$ApiBase,
    [string]$Email,
    [string]$Password
  )
  try {
    $candidateCreds = @()
    $adminEmail = if ($env:E2E_ADMIN_EMAIL) { $env:E2E_ADMIN_EMAIL } else { "admin@example.com" }
    $adminPassword = if ($env:E2E_ADMIN_PASSWORD) { $env:E2E_ADMIN_PASSWORD } else { "Admin12345!" }
    $candidateCreds += @{ Email = $adminEmail; Password = $adminPassword }
    if ($Email -and $Password) {
      $candidateCreds += @{ Email = $Email; Password = $Password }
    }
    if ($env:DPM_SMOKE_EMAIL -and $env:DPM_SMOKE_PASSWORD) {
      $candidateCreds += @{ Email = $env:DPM_SMOKE_EMAIL; Password = $env:DPM_SMOKE_PASSWORD }
    }
    if (-not $candidateCreds) {
      throw "No credentials available for GPS smoke check."
    }

    $token = $null
    $usedEmail = $null
    foreach ($candidate in $candidateCreds) {
      try {
        $loginPayload = @{ email = $candidate.Email; password = $candidate.Password } | ConvertTo-Json
        $login = Invoke-RestMethod -Method Post -Uri "$ApiBase/auth/login" -Body $loginPayload -ContentType "application/json"
        $token = $login.access_token
        if (-not $token) { $token = $login.token }
        if ($token) {
          $token = [string]$token
          $token = $token.Trim('"').Trim()
          $headers = @{ Authorization = "Bearer $token" }
          Invoke-RestMethod -Method Get -Uri "$ApiBase/auth/me" -Headers $headers | Out-Null
          $usedEmail = $candidate.Email
          break
        }
      } catch {
        $token = $null
        $usedEmail = $null
        continue
      }
    }
    if (-not $token) { throw "Login failed for all provided credentials." }

    $headers = @{ Authorization = "Bearer $token" }
    $customers = Invoke-RestMethod -Method Get -Uri "$ApiBase/pwa/customers" -Headers $headers
    if (-not $customers -or $customers.Count -eq 0) { throw "No customers returned." }
    $customer = $customers[0]

    $visitPayload = @{
      customerId = $customer.id
      customerName = $customer.name
      customerType = $customer.type
      notes = "GPS smoke verify"
      visitType = "follow-up"
    } | ConvertTo-Json

    $visit = Invoke-RestMethod -Method Post -Uri "$ApiBase/pwa/visits" -Headers $headers -Body $visitPayload -ContentType "application/json"
    $visitId = $visit.id
    if (-not $visitId) { throw "Visit creation failed." }

    $deviceInfo = "{`"source`":`"verify_pack`",`"platform`":`"windows`"}"
    $timestamp = (Get-Date).ToUniversalTime().ToString("o")

    $startPayload = @{
      lat = 30.0444
      lng = 31.2357
      accuracy = 10
      device_info = $deviceInfo
      started_at = $timestamp
    } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "$ApiBase/visits/$visitId/start" -Headers $headers -Body $startPayload -ContentType "application/json" | Out-Null

    Start-Sleep -Seconds 1

    $endPayload = @{
      lat = 30.0444
      lng = 31.2357
      accuracy = 10
      device_info = $deviceInfo
      ended_at = (Get-Date).ToUniversalTime().ToString("o")
    } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "$ApiBase/visits/$visitId/end" -Headers $headers -Body $endPayload -ContentType "application/json" | Out-Null

    $latest = Invoke-RestMethod -Method Get -Uri "$ApiBase/visits/?page=1&page_size=1" -Headers $headers
    $record = $latest.data[0]
    if (-not $record) { throw "No visit records returned." }

    $hasDeviceInfo = $record.start_device_info -and $record.end_device_info
    $hasTimestamps = $record.started_at -and $record.ended_at
    if (-not ($hasDeviceInfo -and $hasTimestamps)) {
      return [pscustomobject]@{
        Status = "FAIL"
        Message = "Missing device_info or timestamps"
        Email = $usedEmail
      }
    }

    return [pscustomobject]@{
      Status = "PASS"
      Message = "device_info and timestamps present"
      Email = $usedEmail
    }
  } catch {
    return [pscustomobject]@{
      Status = "FAIL"
      Message = $_.Exception.Message
      Email = $Email
    }
  }
}

function Invoke-TelemetryContractCheck {
  param(
    [string]$ApiBase,
    [string]$Email,
    [string]$Password
  )
  try {
    $loginPayload = @{ email = $Email; password = $Password } | ConvertTo-Json
    $login = Invoke-RestMethod -Method Post -Uri "$ApiBase/auth/login" -Body $loginPayload -ContentType "application/json"
    $token = $login.token
    if (-not $token) { throw "Login did not return token." }
    $headers = @{ Authorization = "Bearer $token" }
    Invoke-RestMethod -Method Get -Uri "$ApiBase/auth/me" -Headers $headers | Out-Null

    $payload = @{
      lat = 30.0444
      lng = 31.2357
      accuracy = 12.5
      speed = 1.7
      bearing = 15.0
      ts = (Get-Date).ToUniversalTime().ToString("o")
      device_info = "{`"source`":`"verify_pack`"}"
      source = "verify_pack"
    } | ConvertTo-Json

    $created = Invoke-RestMethod -Method Post -Uri "$ApiBase/telemetry/location" -Headers $headers -Body $payload -ContentType "application/json"
    $repId = $created.rep_id
    if (-not $repId) { throw "Telemetry location missing rep_id." }

    $latest = Invoke-RestMethod -Method Get -Uri "$ApiBase/telemetry/location/latest?rep_id=$repId" -Headers $headers
    $latestItem = if ($latest -is [array]) { $latest[0] } else { $latest }
    if (-not $latestItem) { throw "Telemetry latest response empty." }
    if ($latestItem.lat -ne 30.0444 -or $latestItem.lng -ne 31.2357) {
      throw "Telemetry latest location mismatch."
    }

    return [pscustomobject]@{
      Status = "PASS"
      Message = "Telemetry roundtrip ok"
    }
  } catch {
    return [pscustomobject]@{
      Status = "FAIL"
      Message = $_.Exception.Message
    }
  }
}
$killScript = Join-Path $repoRoot "scripts/kill_dev_node.ps1"
if (Test-Path $killScript) {
  Write-Host "Stopping repo dev processes..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File $killScript
}

$python = Resolve-Python
$pythonCommand = (Quote-Arg $python.Exe)
if ($python.Args.Count -gt 0) {
  $pythonCommand = $pythonCommand + " " + (($python.Args | ForEach-Object { Quote-Arg $_ }) -join " ")
}

$results = @()
$results += Invoke-Step -Name "Backend pytest" -Command "$pythonCommand -m pytest -q" -WorkDir (Join-Path $repoRoot "CRM/backend")
$results += Invoke-Step -Name "CRM frontend test:ci" -Command "npm run test:ci" -WorkDir (Join-Path $repoRoot "CRM/frontend")
$results += Invoke-Step -Name "CRM frontend build" -Command "npm run build" -WorkDir (Join-Path $repoRoot "CRM/frontend")
$results += Invoke-Step -Name "CRM frontend lint" -Command "npm run lint" -WorkDir (Join-Path $repoRoot "CRM/frontend")
$results += Invoke-Step -Name "PWA vitest" -Command "npm run test:vitest" -WorkDir (Join-Path $repoRoot "ALQASEER-PWA")
$results += Invoke-Step -Name "PWA build" -Command "npm run build" -WorkDir (Join-Path $repoRoot "ALQASEER-PWA")
$results += Invoke-Step -Name "PWA lint" -Command "npm run lint" -WorkDir (Join-Path $repoRoot "ALQASEER-PWA")
$backendProc = $null
$pwaProc = $null
$tunnelProc = $null
$tunnelUrl = $null
$tunnelMessage = $null
$tunnelLog = Join-Path $repoRoot "docs/_runs/assets/$timestamp/cloudflared.log"
$visualCompare = [pscustomobject]@{ Status = "FAIL"; Message = "not executed"; DiffFiles = @() }
$gpsSmoke = [pscustomobject]@{ Status = "FAIL"; Message = "not executed" }
$telemetryCheck = [pscustomobject]@{ Status = "FAIL"; Message = "not executed" }
try {
  if (-not (Test-PortOpen -Port 8000)) {
    $backendArgs = @()
    if ($python.Args.Count -gt 0) { $backendArgs += $python.Args }
    $backendArgs += @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000")
    $backendProc = Start-Process -FilePath $python.Exe -ArgumentList $backendArgs `
      -WorkingDirectory (Join-Path $repoRoot "CRM/backend") -PassThru -WindowStyle Hidden
  }
  if (-not (Test-PortOpen -Port 4174)) {
    $pwaProc = Start-Process -FilePath "cmd.exe" -ArgumentList @(
      "/c", "npm", "run", "dev", "--", "--port", "4174", "--host", "127.0.0.1"
    ) -WorkingDirectory (Join-Path $repoRoot "ALQASEER-PWA") -PassThru -WindowStyle Hidden
  }

  $backendReady = Wait-ForHttp -Url "http://127.0.0.1:8000/api/v1/health" -TimeoutSeconds 45
  if (-not $backendReady) {
    Write-Warning "Backend port 8000 did not become ready in time."
  }
  if ($pwaProc -and $pwaProc.HasExited) {
    Write-Warning "PWA dev server process exited early."
  }
  if (-not (Wait-ForHttp -Url "http://127.0.0.1:4174/" -TimeoutSeconds 45)) {
    Write-Warning "PWA port 4174 did not become ready in time."
  }

  if ($env:AUTO_HTTPS_TUNNEL -eq "cloudflare") {
    $tunnelDir = Split-Path $tunnelLog
    if (-not (Test-Path $tunnelDir)) {
      New-Item -ItemType Directory -Path $tunnelDir | Out-Null
    }
    $tunnelInfo = Start-CloudflareTunnel -TargetUrl "http://127.0.0.1:4174" -LogPath $tunnelLog
    $tunnelUrl = $tunnelInfo.Url
    $tunnelMessage = $tunnelInfo.Message
    $tunnelProc = $tunnelInfo.Process
  }

  $results += Invoke-Step -Name "PWA e2e (GPS + Visual)" -Command "npm run e2e" -WorkDir (Join-Path $repoRoot "ALQASEER-PWA")

  $visualCompare = Compare-Visuals `
    -CurrentDir (Join-Path $repoRoot "docs/_runs/assets/$timestamp/pwa") `
    -BaselineDir (Join-Path $repoRoot "docs/_runs/assets/_baseline/pwa") `
    -DiffDir (Join-Path $repoRoot "docs/_runs/assets/$timestamp/pwa-diff")

  $results += [ordered]@{
    Name = "PWA visual regression"
    Command = "visual compare (docs/_runs/assets)"
    Status = $visualCompare.Status
    ExitCode = if ($visualCompare.Status -eq "PASS") { 0 } else { 1 }
    Error = $visualCompare.Message
  }

  $gpsEmail = if ($env:PWA_E2E_EMAIL) { $env:PWA_E2E_EMAIL } else { "rep1@example.com" }
  $gpsPassword = if ($env:PWA_E2E_PASSWORD) { $env:PWA_E2E_PASSWORD } else { "Rep12345!" }
  if ($backendReady) {
    $gpsSmoke = Invoke-RealDeviceGpsCheck -ApiBase "http://127.0.0.1:8000/api/v1" -Email $gpsEmail -Password $gpsPassword
  } else {
    $gpsSmoke = [pscustomobject]@{ Status = "SKIP"; Message = "backend not reachable" }
  }
  $results += [ordered]@{
    Name = "Real-device GPS smoke check"
    Command = "API verify latest visit"
    Status = $gpsSmoke.Status
    ExitCode = if ($gpsSmoke.Status -eq "PASS") { 0 } elseif ($gpsSmoke.Status -eq "SKIP") { 0 } else { 1 }
    Error = $gpsSmoke.Message
  }

  $telemetryEmail = if ($env:E2E_ADMIN_EMAIL) { $env:E2E_ADMIN_EMAIL } else { "admin@example.com" }
  $telemetryPassword = if ($env:E2E_ADMIN_PASSWORD) { $env:E2E_ADMIN_PASSWORD } else { "Admin12345!" }
  if ($backendReady) {
    $telemetryCheck = Invoke-TelemetryContractCheck -ApiBase "http://127.0.0.1:8000/api/v1" -Email $telemetryEmail -Password $telemetryPassword
  } else {
    $telemetryCheck = [pscustomobject]@{ Status = "SKIP"; Message = "backend not reachable" }
  }
  $results += [ordered]@{
    Name = "Telemetry contract check"
    Command = "POST/GET /telemetry/location"
    Status = $telemetryCheck.Status
    ExitCode = if ($telemetryCheck.Status -eq "PASS") { 0 } elseif ($telemetryCheck.Status -eq "SKIP") { 0 } else { 1 }
    Error = $telemetryCheck.Message
  }
} finally {
  Stop-BackgroundProcess -Process $tunnelProc
  Stop-BackgroundProcess -Process $pwaProc
  Stop-BackgroundProcess -Process $backendProc
}

$failed = $results | Where-Object { $_.Status -eq "FAIL" }
$summary = if ($failed.Count -eq 0) { "PASS" } else { "FAIL" }

$assetRoot = Join-Path $repoRoot "docs/_runs/assets/$timestamp"
$diffRoot = Join-Path $repoRoot "docs/_runs/assets/$timestamp/pwa-diff"
$screenshotItems = @()
if (Test-Path $assetRoot) {
  $screenshotItems = Get-ChildItem -Path $assetRoot -Recurse -File | ForEach-Object {
    $_.FullName.Replace("$repoRoot\", "")
  }
}
$diffItems = @()
if (Test-Path $diffRoot) {
  $diffItems = Get-ChildItem -Path $diffRoot -Recurse -File | ForEach-Object {
    $_.FullName.Replace("$repoRoot\", "")
  }
}

$commandsMd = $results | ForEach-Object {
  $errorLine = if ($_['Error']) { " (" + $_['Error'] + ")" } else { "" }
  $tick = [char]96
  "- [$($_['Status'])] $($_['Name']): $tick$($_['Command'])$tick$errorLine"
}

$screenshotsMd = if ($screenshotItems.Count -gt 0) {
  $screenshotItems | ForEach-Object { "- $_" }
} else {
  @("- (none)")
}

$diffMd = if ($diffItems.Count -gt 0) {
  $diffItems | ForEach-Object { "- $_" }
} else {
  @("- (none)")
}

$tunnelMd = if ($tunnelUrl) {
  @("- URL: $tunnelUrl")
} elseif ($tunnelMessage) {
  @("- $tunnelMessage")
} else {
  @("- (not enabled)")
}

$qrPath = Join-Path $repoRoot "docs/_runs/assets/$timestamp/pwa/qr.png"
$qrRelative = $qrPath.Replace("$repoRoot\", "")
$qrStatus = "SKIP"
if ($tunnelUrl) {
  $qrNote = " ($qrRelative)"
} else {
  $qrNote = ""
}
if ($tunnelUrl) {
  $qrEncode = Get-Command qrencode -ErrorAction SilentlyContinue
  if ($qrEncode) {
    & $qrEncode.Source -o $qrPath $tunnelUrl
    $qrStatus = "PASS"
  } else {
    $qrStatus = "SKIP"
  }
}

$gpsSmokeStatus = if ($gpsSmoke) { $gpsSmoke.Status } else { "FAIL" }
$gpsSmokeMessage = if ($gpsSmoke) { $gpsSmoke.Message } else { "not executed" }
$gpsSmokeEmail = if ($gpsSmoke -and $gpsSmoke.Email) { $gpsSmoke.Email } else { "unknown" }
$telemetryStatus = if ($telemetryCheck) { $telemetryCheck.Status } else { "FAIL" }
$telemetryMessage = if ($telemetryCheck) { $telemetryCheck.Message } else { "not executed" }

$report = @"
# Verify Pack Report ($timestamp)

## Commands
$($commandsMd -join "`n")

## Summary
- Overall: $summary
- GPS contract tests: included in PWA e2e
- Visual smoke screenshots: included in PWA e2e
- Visual regression: $($visualCompare.Status)
- Real-device GPS smoke check: $gpsSmokeStatus
- Telemetry contract check: $telemetryStatus

## Screenshots
$($screenshotsMd -join "`n")

## Visual Regression Diffs
$($diffMd -join "`n")

## HTTPS Tunnel
$($tunnelMd -join "`n")
- QR: $qrStatus$qrNote

## Real-device GPS Smoke
- Steps: open URL on phone, accept location permission, press Start Visit, wait 10s, press End Visit.
- Backend check: $gpsSmokeStatus ($gpsSmokeMessage)
- Credential: $gpsSmokeEmail

## Telemetry Contract
- Backend check: $telemetryStatus ($telemetryMessage)

## Remaining risks
- Geolocation still requires secure context on real devices (HTTPS/localhost).  
- Background tracking is supported only in the native wrapper; PWA/web remains foreground-only.
- Android requires foreground service notification + background permission approval.

## Next 3 best actions
- Run verify_pack.ps1 on a clean machine to confirm environment parity.
- Capture real-device GPS evidence over HTTPS for production sign-off.
- Review offline queue conflict handling with real data volume.

## Suggested improvements
- Add mocked API fixtures for PWA e2e to remove backend dependency.
- Add CI task to archive docs/_runs assets after verify pack.

## Next Steps (hard recommendations)
1) Run verify_pack.ps1 nightly in CI with AUTO_HTTPS_TUNNEL=cloudflare and store artifacts.
2) Lock baseline approval flow for visual diffs (manual review before updating baseline).
3) Add real-device GPS pipeline (Android test farm or TWA) to remove remaining device variance.
"@

$reportDir = Split-Path $reportPath
if (-not (Test-Path $reportDir)) {
  New-Item -ItemType Directory -Path $reportDir | Out-Null
}

Set-Content -Path $reportPath -Value $report -Encoding UTF8
Write-Host "REPORT_PATH: $reportPath"
