param(
  [string]$RunDir,
  [string]$CiTruthsJson,
  [int]$MaxRetries = 3,
  [string]$OutMd,
  [string]$OutJson
)

if (-not $RunDir) {
  Write-Error "RunDir is required."
  exit 1
}

$repoRoot = (Resolve-Path ".").Path
$runDirFull = if ([System.IO.Path]::IsPathRooted($RunDir)) { $RunDir } else { Join-Path $repoRoot $RunDir }
$logsDir = Join-Path $runDirFull "logs"
$artifactsDir = Join-Path $runDirFull "artifacts"
$jsonDir = Join-Path $runDirFull "json"

New-Item -ItemType Directory -Force -Path $logsDir, $artifactsDir, $jsonDir | Out-Null

$resolveScript = Join-Path $PSScriptRoot "resolve_python.ps1"
. $resolveScript
$pythonCmd = Resolve-PythonCommand
if (-not $pythonCmd) {
  $pythonCmd = "python"
}

function Replace-PythonCommand {
  param([string]$Line, [string]$Resolved)
  if ($Line -match '^\s*(python3?|py)\b') {
    return ($Line -replace '^\s*(python3?|py)\b', $Resolved)
  }
  return $Line
}

if (-not $CiTruthsJson) {
  $CiTruthsJson = Join-Path $jsonDir "ci_truths.json"
}

if (-not (Test-Path $CiTruthsJson)) {
  Write-Error "CI truths JSON not found at $CiTruthsJson"
  exit 1
}

$ciTruths = Get-Content -Path $CiTruthsJson | ConvertFrom-Json
$gateResults = @()
$overallPass = $true

foreach ($job in $ciTruths.jobs) {
  $jobId = $job.id
  $jobName = $job.name
  $gateLog = Join-Path $logsDir ("gate_{0}.log" -f $jobId)
  if (Test-Path $gateLog) { Remove-Item -Force $gateLog }
  $pwaCiHelper = Join-Path $repoRoot "tools/pwa_npm_ci_windows_no_drama.ps1"

  $attempt = 0
  $jobPass = $false
  $jobError = $null

  while ($attempt -lt $MaxRetries -and -not $jobPass) {
    $attempt++
    Add-Content -Path $gateLog -Value ("=== Attempt {0} ===" -f $attempt)
    $jobPass = $true
    foreach ($step in $job.steps) {
      $run = $step.run
      if (-not $run) { continue }
      $workingDir = $step.working_directory
      if (-not $workingDir -or $workingDir -eq "غير مذكور") {
        $workingDir = $repoRoot
      } else {
        $workingDir = Join-Path $repoRoot $workingDir
      }

      $lines = $run -split "`n"
      foreach ($line in $lines) {
        $cmdLine = $line.Trim()
        if (-not $cmdLine) { continue }
        $cmdLine = Replace-PythonCommand -Line $cmdLine -Resolved $pythonCmd

        Push-Location $workingDir
        try {
          # Windows-only: ALQASEER-PWA npm ci can flake/hang due to locked esbuild.exe.
          # Use a bounded retry helper with timeout to keep gates from "stopping suddenly".
          if ($IsWindows -and (Test-Path $pwaCiHelper) -and ($cmdLine -eq "npm ci") -and ((Split-Path $workingDir -Leaf) -eq "ALQASEER-PWA")) {
            $pwaCiLog = Join-Path $logsDir ("pwa_npm_ci_{0}_attempt{1}.log" -f $jobId, $attempt)
            & $pwaCiHelper -ProjectDir $workingDir -LogPath $pwaCiLog -MaxAttempts 5 -TimeoutMinutes 20 -CleanOnEperm:$false | Out-Null
            if (Test-Path $pwaCiLog) {
              "=== pwa_npm_ci_windows_no_drama log ===" | Out-File -FilePath $gateLog -Append -Encoding utf8
              Get-Content -Path $pwaCiLog | Out-File -FilePath $gateLog -Append -Encoding utf8
            }
            if ($LASTEXITCODE -ne 0) {
              $jobPass = $false
              $jobError = "PWA npm ci failed (helper): $pwaCiHelper"
              break
            }
          } else {
          if ($IsWindows) {
            $output = & cmd.exe /c $cmdLine 2>&1
          } else {
            $output = & bash -lc $cmdLine 2>&1
          }
          if ($output) {
            $output | Out-File -FilePath $gateLog -Append -Encoding utf8
          }
          if ($LASTEXITCODE -ne 0) {
            $jobPass = $false
            $jobError = "Command failed: $cmdLine"
            break
          }
          }
        } catch {
          $jobPass = $false
          $jobError = $_.Exception.Message
          $_ | Out-File -FilePath $gateLog -Append -Encoding utf8
          break
        } finally {
          Pop-Location
        }
      }
      if (-not $jobPass) { break }
    }
    if (-not $jobPass -and $attempt -lt $MaxRetries) {
      Add-Content -Path $gateLog -Value "Retrying..."
    }
  }

  if (-not $jobPass) { $overallPass = $false }

  $gateResults += [ordered]@{
    id = $jobId
    name = $jobName
    pass = $jobPass
    attempts = $attempt
    error = $jobError
    log = $gateLog
  }
}

$gatesOut = [ordered]@{
  overall_pass = $overallPass
  python_command = $pythonCmd
  gates = $gateResults
}

if (-not $OutJson) { $OutJson = Join-Path $jsonDir "gates.json" }
if (-not $OutMd) { $OutMd = Join-Path $artifactsDir "GATES.md" }

$gatesOut | ConvertTo-Json -Depth 8 | Set-Content -Path $OutJson -Encoding utf8

$md = @()
$md += "# GATES"
$md += ""
$md += "overall_pass: $overallPass"
$md += "python_command: $pythonCmd"
$md += ""
$md += "## gate_results"
foreach ($gate in $gateResults) {
  $md += "- id: $($gate.id)"
  $md += "  name: $($gate.name)"
  $md += "  pass: $($gate.pass)"
  $md += "  attempts: $($gate.attempts)"
  $md += "  error: $($gate.error)"
  $md += "  log: $($gate.log)"
}

Set-Content -Path $OutMd -Value ($md -join "`n") -Encoding utf8

if ($overallPass) {
  exit 0
} else {
  exit 1
}
