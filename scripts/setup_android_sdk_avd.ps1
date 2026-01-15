param(
  [string]$SdkRoot,
  [string]$AvdName = "dpm_smoke",
  [string]$SystemImage = "system-images;android-33;google_apis;x86_64",
  [string]$DeviceProfile = "pixel_6",
  [switch]$StartEmulator
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message"
}

function Resolve-SystemImagePath {
  param(
    [string]$Root,
    [string]$ImageId
  )
  $parts = $ImageId -split ";"
  if ($parts.Count -lt 4) { return $null }
  return Join-Path $Root (Join-Path "system-images" (Join-Path $parts[1] (Join-Path $parts[2] $parts[3])))
}

if (-not $SdkRoot) {
  $SdkRoot = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { $env:ANDROID_HOME }
}
if (-not $SdkRoot) {
  $SdkRoot = Join-Path $env:LOCALAPPDATA "Android\\Sdk"
}

$SdkRoot = (Resolve-Path $SdkRoot).Path
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:ANDROID_HOME = $SdkRoot
$sdkChannel = if ($env:DPM_ANDROID_SDK_CHANNEL) { $env:DPM_ANDROID_SDK_CHANNEL } else { "0" }

$cmdlineRoot = Join-Path $SdkRoot "cmdline-tools"
$sdkManager = Join-Path $cmdlineRoot "latest/bin/sdkmanager.bat"
$avdManager = Join-Path $cmdlineRoot "latest/bin/avdmanager.bat"

if (-not (Test-Path $sdkManager)) {
  Write-Step "Installing Android cmdline-tools..."
  $zipUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
  $zipPath = Join-Path $env:TEMP "android_cmdline_tools.zip"
  Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath
  $extractRoot = Join-Path $SdkRoot "cmdline-tools-extract"
  if (-not (Test-Path $extractRoot)) {
    New-Item -ItemType Directory -Path $extractRoot | Out-Null
  }
  Expand-Archive -Path $zipPath -DestinationPath $extractRoot -Force
  $sourceDir = Join-Path $extractRoot "cmdline-tools"
  $latestDir = Join-Path $cmdlineRoot "latest"
  if (Test-Path $latestDir) {
    Write-Step "cmdline-tools already installed; skipping overwrite."
  } else {
    New-Item -ItemType Directory -Path $cmdlineRoot | Out-Null
    Move-Item -Path $sourceDir -Destination $latestDir
  }
}

if (-not (Test-Path $sdkManager)) {
  throw "sdkmanager not found at $sdkManager"
}

Write-Step "Installing SDK packages..."
$packages = @(
  "platform-tools",
  "platforms;android-33",
  "emulator",
  $SystemImage
)

$yesFile = Join-Path $env:TEMP "sdkmanager_yes.txt"
Set-Content -Path $yesFile -Value (("y`n") * 200) -Encoding ASCII
$installLog = Join-Path $env:TEMP "sdkmanager_install.log"
$installErr = Join-Path $env:TEMP "sdkmanager_install.err.log"

function Invoke-SdkManager {
  param([string[]]$SdkArgs)
  $argLine = ($SdkArgs | ForEach-Object {
    if ($_ -match ";") { "`"$_`"" } else { $_ }
  }) -join " "
  Write-Step ("sdkmanager args: " + $argLine)
  $proc = Start-Process -FilePath $sdkManager -ArgumentList $argLine `
    -RedirectStandardInput $yesFile -RedirectStandardOutput $installLog -RedirectStandardError $installErr `
    -NoNewWindow -PassThru
  $completed = $proc.WaitForExit(900000)
  if (-not $completed) {
    try { $proc.Kill() } catch { }
    throw "sdkmanager timed out. See $installLog and $installErr"
  }
  if (Test-Path $installLog) { Get-Content $installLog | Out-Host }
  if (Test-Path $installErr) { Get-Content $installErr | Out-Host }
  if ($proc.ExitCode -ne 0) {
    throw "sdkmanager failed with exit code $($proc.ExitCode). See $installLog and $installErr"
  }
}

Invoke-SdkManager -SdkArgs (@("--sdk_root=$SdkRoot", "--channel=$sdkChannel") + $packages)
Invoke-SdkManager -SdkArgs @("--sdk_root=$SdkRoot", "--channel=$sdkChannel", "--licenses")

$systemImagePath = Resolve-SystemImagePath -Root $SdkRoot -ImageId $SystemImage
if (-not $systemImagePath -or -not (Test-Path $systemImagePath)) {
  throw "System image not found after install: $SystemImage"
}

if (-not (Test-Path $avdManager)) {
  throw "avdmanager not found at $avdManager"
}

Write-Step "Ensuring AVD exists ($AvdName)..."
$avdList = & $avdManager list avd 2>$null
if (-not ($avdList -match "Name:\s+$AvdName")) {
  cmd /c "echo no | `"$avdManager`" create avd -n $AvdName -k `"$SystemImage`" -d $DeviceProfile -f" | Out-Host
}
if (-not (($avdList + (& $avdManager list avd 2>$null)) -match "Name:\s+$AvdName")) {
  throw "AVD $AvdName was not created. Check SDK system image installation."
}

if ($StartEmulator) {
  $emulatorExe = Join-Path $SdkRoot "emulator/emulator.exe"
  if (-not (Test-Path $emulatorExe)) {
    throw "emulator not found at $emulatorExe"
  }
  Write-Step "Starting emulator ($AvdName)..."
  Start-Process -FilePath $emulatorExe -ArgumentList @(
    "-avd", $AvdName,
    "-netdelay", "none",
    "-netspeed", "full",
    "-no-window",
    "-no-audio",
    "-no-snapshot",
    "-gpu", "swiftshader_indirect"
  ) | Out-Null
  $adbExe = Join-Path $SdkRoot "platform-tools/adb.exe"
  if (Test-Path $adbExe) {
    $elapsed = 0
    while ($elapsed -lt 180) {
      $device = & $adbExe devices | Select-String -Pattern "\sdevice$"
      if ($device) { break }
      Start-Sleep -Seconds 5
      $elapsed += 5
    }
    $bootElapsed = 0
    while ($bootElapsed -lt 180) {
      $boot = & $adbExe shell getprop sys.boot_completed 2>$null
      if ($boot -match "1") { break }
      Start-Sleep -Seconds 5
      $bootElapsed += 5
    }
  }
}
