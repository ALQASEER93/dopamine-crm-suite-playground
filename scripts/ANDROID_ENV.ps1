$ErrorActionPreference = 'Stop'

$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:ANDROID_SDK_ROOT = "D:\Android\Sdk"

$prepend = @(
  "$env:JAVA_HOME\bin",
  "$env:ANDROID_SDK_ROOT\platform-tools",
  "$env:ANDROID_SDK_ROOT\cmdline-tools\latest\bin"
)

$env:PATH = ($prepend -join ';') + ';' + $env:PATH

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_SDK_ROOT=$env:ANDROID_SDK_ROOT"

Write-Host "---"
java -version
Write-Host "---"
adb --version
Write-Host "---"
& "$env:ANDROID_SDK_ROOT\cmdline-tools\latest\bin\sdkmanager.bat" --version
