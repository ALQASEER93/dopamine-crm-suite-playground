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
$assetPath = Join-Path $runDir "assetlinks_${ts}.json"
$reportPath = Join-Path $runDir "android_build_${ts}.md"

$androidDir = Join-Path $repoRoot 'android'
$buildGradle = Join-Path $androidDir 'app/build.gradle'

$packageId = $null
if (Test-Path $buildGradle) {
  $match = Select-String -Path $buildGradle -Pattern 'applicationId\s+"([^"]+)"' | Select-Object -First 1
  if ($match) {
    $packageId = $match.Matches[0].Groups[1].Value
  }
}

if (-not $packageId) {
  $packageId = 'com.example.app'
}

$assetlinks = @(
  @{
    relation = @('delegate_permission/common.handle_all_urls')
    target = @{
      namespace = 'android_app'
      package_name = $packageId
      sha256_cert_fingerprints = @('REPLACE_WITH_SHA256_CERT_FINGERPRINT')
    }
  }
)

$assetlinks | ConvertTo-Json -Depth 6 | Set-Content -Path $assetPath -Encoding UTF8

$hasGradle = (Test-Path (Join-Path $androidDir 'gradlew.bat')) -or (Test-Path (Join-Path $androidDir 'gradlew'))
$hasJava = $null -ne (Get-Command java -ErrorAction SilentlyContinue)
$hasSdk = $env:ANDROID_HOME -or $env:ANDROID_SDK_ROOT
$hasBubblewrap = $null -ne (Get-Command bubblewrap -ErrorAction SilentlyContinue)

$lines = @()
$lines += "# Android TWA Build Report"
$lines += ""
$lines += "- Timestamp: $ts"
$lines += "- Package ID: $packageId"
$lines += "- Assetlinks: $assetPath"
$lines += ""

if ($hasGradle -and $hasJava -and $hasSdk) {
  $lines += "## Build Attempt"
  $lines += "- Toolchain detected: java + gradlew + ANDROID_HOME/ANDROID_SDK_ROOT"
  $lines += ""
  $logPath = Join-Path $runDir "android_build_${ts}.log"
  Push-Location $androidDir
  try {
    if (Test-Path (Join-Path $androidDir 'gradlew.bat')) {
      & .\gradlew.bat assembleDebug *>&1 | Tee-Object -FilePath $logPath | Out-Null
    } else {
      & .\gradlew assembleDebug *>&1 | Tee-Object -FilePath $logPath | Out-Null
    }
    $lines += "- Build log: $logPath"
    $lines += "- Result: PASS"
  } catch {
    $lines += "- Build log: $logPath"
    $lines += "- Result: FAIL"
    $lines += "- Error: $($_.Exception.Message)"
  } finally {
    Pop-Location
  }
} else {
  $lines += "## Build Checklist (missing toolchain)"
  if (-not $hasJava) { $lines += "- Install JDK (17 recommended) and ensure java is on PATH" }
  if (-not $hasSdk) { $lines += "- Set ANDROID_HOME or ANDROID_SDK_ROOT and install Android SDK" }
  if (-not $hasGradle) { $lines += "- Ensure android/gradlew(.bat) exists and is executable" }
  if (-not $hasBubblewrap) { $lines += "- Install bubblewrap if building a TWA bundle" }
}

$lines | Set-Content -Path $reportPath -Encoding UTF8
Write-Output $assetPath
Write-Output $reportPath
