param(
  [string]$PromptPath,
  [string]$PromptString,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path,
  [string]$Sandbox = "workspace-write",
  [string]$ApprovalPolicy = "never",
  [string]$NetworkAccess = "true"
)

$ErrorActionPreference = "Stop"

if (-not $PromptPath -and -not $PromptString) {
  Write-Error "Provide -PromptPath or -PromptString."
  exit 1
}

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$runDir = Join-Path $RepoRoot "_runs\\codex_runs\\$ts"
New-Item -ItemType Directory -Force $runDir | Out-Null

$promptFile = if ($PromptPath) {
  $dest = Join-Path $runDir "PROMPT.txt"
  Copy-Item -Path $PromptPath -Destination $dest -Force
  $dest
} else {
  $dest = Join-Path $runDir "PROMPT.txt"
  Set-Content -Path $dest -Value $PromptString -Encoding UTF8
  $dest
}

$lastMsg = Join-Path $runDir "LAST_MESSAGE.md"
$stdoutLog = Join-Path $runDir "OUTPUT.log"
$cmdLog = Join-Path $runDir "COMMAND.txt"

$cmd = @(
  "codex",
  "--ask-for-approval", $ApprovalPolicy,
  "--sandbox", $Sandbox,
  "exec",
  "--cd", $RepoRoot,
  "--config", "sandbox_workspace_write.network_access=$NetworkAccess",
  "--output-last-message", $lastMsg,
  "-"
) -join " "

Set-Content -Path $cmdLog -Value $cmd -Encoding UTF8

Get-Content -Raw $promptFile |
  & codex --ask-for-approval $ApprovalPolicy --sandbox $Sandbox exec `
    --cd $RepoRoot `
    --config "sandbox_workspace_write.network_access=$NetworkAccess" `
    --output-last-message $lastMsg `
    - 2>&1 | Tee-Object -FilePath $stdoutLog

Write-Host "Run logged to $runDir"

<#
Examples

1) Heredoc prompt:
.\\tools\\codex\\RUN_CODEX.ps1 -PromptString @'
Task: summarize git status and recent commits
'@

2) File prompt:
.\\tools\\codex\\RUN_CODEX.ps1 -PromptPath .\\prompts\\task.txt

3) Quoting git refs in PowerShell:
git rev-parse "@{u}"
git show "stash@{0}"
#>
