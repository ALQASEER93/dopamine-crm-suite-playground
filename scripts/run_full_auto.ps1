param(
  [string]$RunId,
  [int]$MaxRetries = 3
)

$repoRoot = (Resolve-Path ".").Path
$ts = if ($RunId) { $RunId } else { Get-Date -Format "yyyyMMdd_HHmmss" }
$runName = "run_$ts"
$runDir = Join-Path "docs/_runs" $runName
$artifactsDir = Join-Path $runDir "artifacts"
$logsDir = Join-Path $runDir "logs"
$jsonDir = Join-Path $runDir "json"

New-Item -ItemType Directory -Force -Path $artifactsDir, $logsDir, $jsonDir | Out-Null
Set-Content -Path "docs/_runs/LATEST.txt" -Value $runName -Encoding utf8

$gitStateLog = Join-Path $logsDir "git_state.log"
"# git status --porcelain" | Out-File -FilePath $gitStateLog -Encoding utf8
(git status --porcelain) | Out-File -FilePath $gitStateLog -Append -Encoding utf8
"# git branch --show-current" | Out-File -FilePath $gitStateLog -Append -Encoding utf8
(git branch --show-current) | Out-File -FilePath $gitStateLog -Append -Encoding utf8
"# git rev-parse HEAD" | Out-File -FilePath $gitStateLog -Append -Encoding utf8
(git rev-parse HEAD) | Out-File -FilePath $gitStateLog -Append -Encoding utf8
"# git remote -v" | Out-File -FilePath $gitStateLog -Append -Encoding utf8
(git remote -v) | Out-File -FilePath $gitStateLog -Append -Encoding utf8
"# git stash list -n 10" | Out-File -FilePath $gitStateLog -Append -Encoding utf8
(git stash list -n 10) | Out-File -FilePath $gitStateLog -Append -Encoding utf8

$branch = git branch --show-current
$sha = git rev-parse HEAD
$status = (git status --porcelain | Out-String).TrimEnd()
$remote = (git remote -v | Out-String).TrimEnd()
$stashList = (git stash list -n 10 | Out-String).TrimEnd()
$stashRef = "غير مذكور"
$stashLogPath = Join-Path $logsDir "git_stash.log"

if ($status) {
  $stashMessage = "pre_full_auto_$ts"
  $stashOutput = git stash push -u -m $stashMessage
  $stashRef = "stash@{0}"
  $stashOutput | Out-File -FilePath $stashLogPath -Encoding utf8
  $statusAfter = (git status --porcelain | Out-String).TrimEnd()
  if ($statusAfter) {
    $failMsg = "Working tree not clean after stash."
    $ownerActions = Join-Path $artifactsDir "OWNER_ACTIONS.md"
    Set-Content -Path $ownerActions -Value "# OWNER_ACTIONS`n`n$failMsg`n`nالرجاء فتح مستكشف الملفات والتحقق من الملفات المعدلة، ثم إعادة تشغيل FULL AUTO." -Encoding utf8
    $stateContent = @(
      "# STATE",
      "",
      "repo_path: $repoRoot",
      "branch: $branch",
      "head_sha: $sha",
      "",
      "## git_status_porcelain",
      '```',
      $status,
      '```',
      "",
      "## git_remote_v",
      '```',
      $remote,
      '```',
      "",
      "## git_stash_list_top10",
      '```',
      $stashList,
      '```',
      "",
      "## pre_full_auto_stash",
      '```',
      $stashRef,
      '```'
    ) -join "`n"
    Set-Content -Path (Join-Path $artifactsDir "STATE.md") -Value $stateContent -Encoding utf8
    Write-Output "RUN_DIR=$runDir"
    Write-Output "OVERALL=FAIL"
    Write-Output "ZIP=غير مذكور"
    Write-Output "STASH=$stashRef"
    exit 1
  }
}

$stateContent = @(
  "# STATE",
  "",
  "repo_path: $repoRoot",
  "branch: $branch",
  "head_sha: $sha",
  "",
  "## git_status_porcelain",
  '```',
  $status,
  '```',
  "",
  "## git_remote_v",
  '```',
  $remote,
  '```',
  "",
  "## git_stash_list_top10",
  '```',
  $stashList,
  '```',
  "",
  "## pre_full_auto_stash",
  '```',
  $stashRef,
  '```'
) -join "`n"
Set-Content -Path (Join-Path $artifactsDir "STATE.md") -Value $stateContent -Encoding utf8

$ciJson = Join-Path $jsonDir "ci_truths.json"
$ciMd = Join-Path $artifactsDir "CI_TRUTHS.md"
$ciScript = Join-Path $PSScriptRoot "ci_extract.ps1"
& $ciScript -Path ".github/workflows/ci.yml" -OutJson $ciJson -OutMd $ciMd
if ($LASTEXITCODE -ne 0) {
  Set-Content -Path $ciMd -Value "# CI_TRUTHS`n`nغير مذكور`n`nالمطلوب: تشغيل scripts/ci_extract.ps1 على .github/workflows/ci.yml" -Encoding utf8
}

$deltaMd = Join-Path $artifactsDir "DELTA_VS_MAIN.md"
$deltaJson = Join-Path $jsonDir "delta.json"
$patchDiff = Join-Path $artifactsDir "PATCH.diff"

$fetchOk = $true
try {
  git fetch origin main | Out-Null
} catch {
  $fetchOk = $false
}

$baseSha = "غير مذكور"
if ($fetchOk) {
  $baseSha = (git rev-parse origin/main 2>$null)
}

$changedFiles = @()
$diffStat = "غير مذكور"
if ($fetchOk -and $baseSha) {
  $diffStat = (git diff --stat origin/main...HEAD | Out-String).TrimEnd()
  $changedFiles = (git diff --name-status origin/main...HEAD | Out-String).TrimEnd().Split("`n")
  git diff --binary origin/main...HEAD | Set-Content -Path $patchDiff -Encoding utf8
} else {
  Set-Content -Path $patchDiff -Value "غير مذكور`nالمطلوب: git fetch origin main" -Encoding utf8
}

$deltaContent = @(
  "# DELTA_VS_MAIN",
  "",
  "base_sha: $baseSha",
  "head_sha: $sha",
  "",
  "## diff_stat",
  '```',
  $diffStat,
  '```',
  "",
  "## changed_files",
  '```'
) + $changedFiles + @('```')
Set-Content -Path $deltaMd -Value ($deltaContent -join "`n") -Encoding utf8

$deltaObj = [ordered]@{
  base_sha = $baseSha
  head_sha = $sha
  diff_stat = $diffStat
  changed_files = $changedFiles
}
$deltaObj | ConvertTo-Json -Depth 6 | Set-Content -Path $deltaJson -Encoding utf8

$sizeMd = Join-Path $artifactsDir "size_breakdown.md"
$sizeLines = @("# SIZE_BREAKDOWN", "")
$totalSize = 0
if ($fetchOk -and $changedFiles -and $changedFiles[0]) {
  foreach ($entry in $changedFiles) {
    if (-not $entry) { continue }
    $parts = $entry -split "\s+", 2
    $filePath = if ($parts.Length -gt 1) { $parts[1].Trim() } else { $parts[0].Trim() }
    if (Test-Path $filePath) {
      $size = (Get-Item $filePath).Length
      $totalSize += $size
      $sizeLines += "- ${filePath}: $size"
    } else {
      $sizeLines += "- ${filePath}: غير مذكور (file missing)"
    }
  }
  $sizeLines += ""
  $sizeLines += "total_bytes: $totalSize"
} else {
  $sizeLines += "غير مذكور"
  $sizeLines += "المطلوب: git diff origin/main...HEAD"
}
Set-Content -Path $sizeMd -Value ($sizeLines -join "`n") -Encoding utf8

$gatesMd = Join-Path $artifactsDir "GATES.md"
$gatesJson = Join-Path $jsonDir "gates.json"
$gatesScript = Join-Path $PSScriptRoot "run_gates.ps1"
& $gatesScript -RunDir $runDir -CiTruthsJson $ciJson -MaxRetries $MaxRetries -OutMd $gatesMd -OutJson $gatesJson
$gatesExit = $LASTEXITCODE

$ownerActionsPath = Join-Path $artifactsDir "OWNER_ACTIONS.md"
if (Test-Path $gatesJson) {
  $gatesData = Get-Content -Path $gatesJson | ConvertFrom-Json
  foreach ($gate in $gatesData.gates) {
    if ($gate.error -and ($gate.error -match "not recognized" -or $gate.error -match "command not found")) {
      Set-Content -Path $ownerActionsPath -Value "# OWNER_ACTIONS`n`nتعذر تشغيل أحد الأوامر محليا. يرجى فتح لوحة التحكم > البرامج > تثبيت Node.js LTS وPython 3.11 عبر المثبت الرسمي، ثم إعادة تشغيل FULL AUTO." -Encoding utf8
      break
    }
  }
}

$qwenEvidence = Join-Path $artifactsDir "QWEN_EVIDENCE.md"
$sections = @()
$sections += Get-Content -Path (Join-Path $artifactsDir "STATE.md")
$sections += ""
$sections += Get-Content -Path $ciMd
$sections += ""
$sections += Get-Content -Path $deltaMd
$sections += ""
$sections += Get-Content -Path $gatesMd
$sections += ""
$sections += "# gate_log_tail"
if (Test-Path $gatesJson) {
  $gatesData = Get-Content -Path $gatesJson | ConvertFrom-Json
  foreach ($gate in $gatesData.gates) {
    $logPath = $gate.log
    $sections += "## $($gate.id)"
    if (Test-Path $logPath) {
      $tail = Get-Content -Path $logPath -Tail 80
      $sections += '```'
      $sections += $tail
      $sections += '```'
    } else {
      $sections += "غير مذكور"
      $sections += "المطلوب: gate log at $logPath"
    }
  }
}
Set-Content -Path $qwenEvidence -Value ($sections -join "`n") -Encoding utf8

$handoffAudit = Join-Path $artifactsDir "HANDOFF_QWEN_AUDIT.txt"
$handoffFix = Join-Path $artifactsDir "HANDOFF_CODEX_CLI_FIX.txt"
$handoffGates = Join-Path $artifactsDir "HANDOFF_CODEX_EXEC_GATES.txt"
$handoffPlan = Join-Path $artifactsDir "HANDOFF_ANTIGRAVITY_PLAN.txt"

Set-Content -Path $handoffAudit -Value "Use QWEN_EVIDENCE.md for audit-only findings. No code changes." -Encoding utf8
Set-Content -Path $handoffFix -Value "Use QWEN_EVIDENCE.md. Apply minimal fixes only; no refactors." -Encoding utf8
Set-Content -Path $handoffGates -Value "Rerun gates only using scripts/run_gates.ps1 with the same RunDir." -Encoding utf8
Set-Content -Path $handoffPlan -Value "Plan-only response based on QWEN_EVIDENCE.md." -Encoding utf8

$overall = if ($gatesExit -eq 0) { "PASS" } else { "FAIL" }

$report = @(
  "# report",
  "",
  "overall: $overall",
  "run_dir: $runDir",
  "",
  "## key_findings",
  if ($gatesExit -eq 0) { "- Gates passed." } else { "- Gates failed or missing dependencies." },
  "",
  "## next_actions",
  if (Test-Path $ownerActionsPath) { "- Review OWNER_ACTIONS.md" } else { "- Review GATES.md for failures if any." }
)
Set-Content -Path (Join-Path $runDir "report.md") -Value ($report -join "`n") -Encoding utf8

$zipPath = "docs/_runs/$runName.zip"
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path $runDir -DestinationPath $zipPath

Write-Output "RUN_DIR=$runDir"
Write-Output "OVERALL=$overall"
Write-Output "ZIP=$zipPath"
Write-Output "STASH=$stashRef"

if ($gatesExit -eq 0) { exit 0 } else { exit 1 }
