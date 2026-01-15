$ErrorActionPreference = "Stop"

param(
  [string]$SdkRoot,
  [string]$AvdName = "dpm_smoke",
  [string]$SystemImage = "system-images;android-33;google_apis;x86_64",
  [string]$DeviceProfile = "pixel_6",
  [switch]$StartEmulator
)

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message"
}

if (-not $SdkRoot) {
  $SdkRoot = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { $env:ANDROID_HOME }
}
if (-not $SdkRoot) {
  $SdkRoot = Join-Path $env:LOCALAPPDATA "Android\\Sdk"
}

$SdkRoot = (Resolve-Path $SdkRoot).Path

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

$installArgs = $packages | ForEach-Object { "`"$_`"" } | Join-String " "
cmd /c "echo y | `"$sdkManager`" --sdk_root=`"$SdkRoot`" $installArgs" | Out-Host
cmd /c "echo y | `"$sdkManager`" --sdk_root=`"$SdkRoot`" --licenses" | Out-Host

if (-not (Test-Path $avdManager)) {
  throw "avdmanager not found at $avdManager"
}

Write-Step "Ensuring AVD exists ($AvdName)..."
$avdList = & $avdManager list avd 2>$null
if (-not ($avdList -match "Name:\s+$AvdName")) {
  cmd /c "echo no | `"$avdManager`" create avd -n $AvdName -k `"$SystemImage`" -d $DeviceProfile -f" | Out-Host
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
    & $adbExe wait-for-device | Out-Null
    $elapsed = 0
    while ($elapsed -lt 180) {
      $boot = & $adbExe shell getprop sys.boot_completed 2>$null
      if ($boot -match "1") { break }
      Start-Sleep -Seconds 5
      $elapsed += 5
    }
  }
}
