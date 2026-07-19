Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$WrongVaultPathToken = 'ALQASEER_DEV' + '_DPM_PRIVATE_VAULT'

Push-Location $RepoRoot
try {
  $matches = & rg -n --hidden --no-ignore `
    -g '!**/node_modules/**' `
    -g '!.git/**' `
    -g '!docs/_runs/run_*/**' `
    -g '!docs/docs/_runs/run_*/**' `
    -g '!docs/project_context/docs/_runs/run_*/**' `
    -g '!**/*.zip' `
    -g '!CRM/frontend/test-results/**' `
    $WrongVaultPathToken .

  if ($LASTEXITCODE -eq 1) {
    Write-Output 'PASS: no active collapsed vault path references found.'
    exit 0
  }

  if ($LASTEXITCODE -ne 0) {
    throw "rg failed with exit code $LASTEXITCODE"
  }

  Write-Output 'BLOCKED: active collapsed vault path references found.'
  $matches
  exit 2
}
finally {
  Pop-Location
}
