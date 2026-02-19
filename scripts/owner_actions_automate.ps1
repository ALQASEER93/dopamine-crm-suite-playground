param(
  [string]$Repo = "ALQASEER93/dopamine-crm-suite-playground",
  [string]$EnvFile = ".\scripts\owner_actions.env",
  [switch]$ApplyGithubSecrets,
  [switch]$TriggerCloudflareDeploy,
  [switch]$TriggerFieldReadyDeploy
)

$ErrorActionPreference = "Stop"

function Parse-EnvFile {
  param([string]$Path)
  $result = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $result }
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $k = $line.Substring(0, $idx).Trim()
    $v = $line.Substring($idx + 1).Trim()
    if ($v.StartsWith('"') -and $v.EndsWith('"') -and $v.Length -ge 2) {
      $v = $v.Substring(1, $v.Length - 2)
    }
    $result[$k] = $v
  }
  return $result
}

function Set-GhSecret {
  param(
    [string]$Name,
    [string]$Value
  )
  if (-not $Value) {
    Write-Host "Skip secret $Name (empty)."
    return
  }
  $tmp = New-TemporaryFile
  try {
    Set-Content -LiteralPath $tmp -Value $Value -NoNewline -Encoding UTF8
    gh secret set $Name --repo $Repo --app actions --body-file $tmp | Out-Null
    Write-Host "Set secret: $Name"
  } finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "Checking GitHub auth..."
gh auth status | Out-Null

$requiredCore = @(
  "OPENAI_API_KEY",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_PROJECT_NAME",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID"
)

$envMap = Parse-EnvFile -Path $EnvFile

if ($ApplyGithubSecrets) {
  foreach ($key in $requiredCore) {
    $value = $envMap[$key]
    if (-not $value -and $env:$key) { $value = $env:$key }
    Set-GhSecret -Name $key -Value $value
  }
}

Write-Host ""
Write-Host "Current GitHub Actions secrets:"
gh secret list --repo $Repo --app actions

Write-Host ""
Write-Host "Trigger options:"
if ($TriggerCloudflareDeploy) {
  gh workflow run "Field-Ready Deploy (Cloudflare)" --repo $Repo
  Write-Host "Triggered: Field-Ready Deploy (Cloudflare)"
}
if ($TriggerFieldReadyDeploy) {
  gh workflow run "Field-Ready Deploy" --repo $Repo
  Write-Host "Triggered: Field-Ready Deploy"
}

Write-Host ""
Write-Host "Done."
Write-Host "If a secret is still missing, add it to $EnvFile and rerun with -ApplyGithubSecrets."
