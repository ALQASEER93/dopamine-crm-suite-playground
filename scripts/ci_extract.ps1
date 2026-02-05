param(
  [string]$Path = ".github/workflows/ci.yml",
  [string]$OutJson,
  [string]$OutMd
)

function Get-Indent {
  param([string]$Line)
  $match = [regex]::Match($Line, '^(\s*)')
  return $match.Groups[1].Value.Length
}

function Normalize-Trigger {
  param([string]$Value)
  return ($Value -replace '[^A-Za-z0-9_-]', '').Trim()
}

if (-not (Test-Path $Path)) {
  Write-Error "CI workflow not found at $Path"
  exit 1
}

$lines = Get-Content -Path $Path
$workflowName = $null
$triggers = New-Object System.Collections.Generic.HashSet[string]
$jobs = @()

for ($i = 0; $i -lt $lines.Count; $i++) {
  $line = $lines[$i]
  if (-not $workflowName) {
    if ($line -match '^\s*name:\s*(.+)$' -and (Get-Indent $line) -eq 0) {
      $workflowName = $Matches[1].Trim()
    }
  }
}

for ($i = 0; $i -lt $lines.Count; $i++) {
  $line = $lines[$i]
  if ($line -match '^\s*on:\s*\[(.+)\]\s*$' -and (Get-Indent $line) -eq 0) {
    $raw = $Matches[1]
    foreach ($item in $raw.Split(',')) {
      $t = Normalize-Trigger $item
      if ($t) { $triggers.Add($t) | Out-Null }
    }
  }

  if ($line -match '^\s*on:\s*$' -and (Get-Indent $line) -eq 0) {
    $onIndent = Get-Indent $line
    for ($j = $i + 1; $j -lt $lines.Count; $j++) {
      $sub = $lines[$j]
      if ($sub -match '^\s*$' -or $sub.Trim().StartsWith('#')) { continue }
      $indent = Get-Indent $sub
      if ($indent -le $onIndent) { break }
      if ($sub -match '^\s*([A-Za-z0-9_-]+)\s*:') {
        $t = Normalize-Trigger $Matches[1]
        if ($t) { $triggers.Add($t) | Out-Null }
      }
    }
  }
}

for ($i = 0; $i -lt $lines.Count; $i++) {
  $line = $lines[$i]
  if ($line -match '^\s*jobs:\s*$' -and (Get-Indent $line) -eq 0) {
    $jobsIndent = Get-Indent $line
    for ($j = $i + 1; $j -lt $lines.Count; $j++) {
      $jobLine = $lines[$j]
      if ($jobLine -match '^\s*$' -or $jobLine.Trim().StartsWith('#')) { continue }
      $jobIndent = Get-Indent $jobLine
      if ($jobIndent -le $jobsIndent) { break }
      if ($jobIndent -eq ($jobsIndent + 2) -and $jobLine -match '^\s*([A-Za-z0-9_-]+)\s*:\s*$') {
        $jobId = $Matches[1]
        $jobName = $null
        $steps = @()
        $currentStepWorkingDir = $null
        $inStep = $false

        for ($k = $j + 1; $k -lt $lines.Count; $k++) {
          $lineK = $lines[$k]
          if ($lineK -match '^\s*$' -or $lineK.Trim().StartsWith('#')) { continue }
          $indentK = Get-Indent $lineK
          if ($indentK -le $jobIndent) {
            $j = $k - 1
            break
          }

          if (-not $jobName -and $lineK -match '^\s*name:\s*(.+)$') {
            $jobName = $Matches[1].Trim()
            continue
          }

          if ($lineK -match '^\s*-\s+') {
            $currentStepWorkingDir = $null
            $inStep = $true
            if ($lineK -match '^\s*-\s*run:\s*(.+)$') {
              $runLine = $Matches[1]
              $steps += [ordered]@{ working_directory = $currentStepWorkingDir; run = $runLine }
              $inStep = $false
            }
            continue
          }

          if ($inStep -and $lineK -match '^\s*working-directory:\s*(.+)$') {
            $currentStepWorkingDir = $Matches[1].Trim()
            continue
          }

          if ($inStep -and $lineK -match '^\s*run:\s*(.+)$') {
            $runValue = $Matches[1].Trim()
            if ($runValue -eq '|' -or $runValue -eq '>') {
              $runIndent = Get-Indent $lineK
              $block = @()
              for ($m = $k + 1; $m -lt $lines.Count; $m++) {
                $blockLine = $lines[$m]
                $blockIndent = Get-Indent $blockLine
                if ($blockIndent -le $runIndent) { break }
                $block += ($blockLine.TrimEnd())
                $k = $m
              }
              $runValue = ($block -join "`n").Trim()
            }
            $steps += [ordered]@{ working_directory = $currentStepWorkingDir; run = $runValue }
            $inStep = $false
          }
        }

        $jobs += [ordered]@{
          id = $jobId
          name = $jobName
          steps = $steps
        }
      }
    }
  }
}

if (-not $workflowName) { $workflowName = "غير مذكور" }
if ($triggers.Count -eq 0) { $triggers.Add("غير مذكور") | Out-Null }

$result = [ordered]@{
  workflow_name = $workflowName
  triggers = @($triggers)
  jobs = $jobs
}

if ($OutJson) {
  $json = $result | ConvertTo-Json -Depth 8
  Set-Content -Path $OutJson -Value $json -Encoding utf8
}

if ($OutMd) {
  $linesOut = @()
  $linesOut += "# CI_TRUTHS"
  $linesOut += ""
  $linesOut += "workflow_name: $($result.workflow_name)"
  $linesOut += "triggers: $([string]::Join(', ', $result.triggers))"
  $linesOut += ""
  $linesOut += "## jobs"
  foreach ($job in $result.jobs) {
    $linesOut += "- id: $($job.id)"
    $linesOut += "  name: $($job.name)"
    if ($job.steps.Count -eq 0) {
      $linesOut += "  steps: غير مذكور"
    } else {
      $linesOut += "  steps:"
      foreach ($step in $job.steps) {
        $wd = $step.working_directory
        if (-not $wd) { $wd = "غير مذكور" }
        $run = $step.run
        if (-not $run) { $run = "غير مذكور" }
        $linesOut += "  - working_directory: $wd"
        $linesOut += "    run: $run"
      }
    }
  }
  Set-Content -Path $OutMd -Value ($linesOut -join "`n") -Encoding utf8
}

if (-not $OutJson -and -not $OutMd) {
  $result | ConvertTo-Json -Depth 8
}
