$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$pwaRoot = Join-Path $repoRoot "ALQASEER-PWA"
$androidRoot = Join-Path $pwaRoot "android"
$apkPath = Join-Path $androidRoot "app/build/outputs/apk/debug/app-debug.apk"

Push-Location $pwaRoot
try {
  Write-Host "Building PWA assets..."
  npm run build | Out-Host
  Write-Host "Syncing Capacitor Android..."
  npx cap sync android | Out-Host
} finally {
  Pop-Location
}

Push-Location $androidRoot
try {
  Write-Host "Building Android debug APK..."
  if ($IsWindows) {
    & .\gradlew.bat assembleDebug | Out-Host
  } else {
    if (Test-Path "./gradlew") {
      & chmod +x ./gradlew | Out-Null
    }
    & ./gradlew assembleDebug | Out-Host
  }
} finally {
  Pop-Location
}

if (-not (Test-Path $apkPath)) {
  throw "APK not found at $apkPath"
}

Write-Host "APK_PATH: $apkPath"
