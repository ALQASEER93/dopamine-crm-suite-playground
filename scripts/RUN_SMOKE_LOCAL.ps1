param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [string]$Label,
    [scriptblock]$Action
  )
  Write-Host "== $Label"
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Label"
  }
}

Write-Host "Repo: $RepoRoot"

Invoke-Step "Backend venv + deps" {
  Set-Location (Join-Path $RepoRoot "CRM\\backend")
  if (-not (Test-Path ".venv")) {
    python -m venv .venv
  }
  if (Test-Path ".venv\\Scripts\\Activate.ps1") {
    . .\\.venv\\Scripts\\Activate.ps1
  }
  pip install -r requirements.txt
}

Invoke-Step "Backend pytest" {
  Set-Location (Join-Path $RepoRoot "CRM\\backend")
  python -m pytest -q
}

Invoke-Step "CRM frontend install + build" {
  Set-Location (Join-Path $RepoRoot "CRM\\frontend")
  if (Test-Path "package-lock.json") {
    npm ci
  } else {
    npm install --no-package-lock
  }
  npm run build
}

Invoke-Step "PWA install + build" {
  Set-Location (Join-Path $RepoRoot "ALQASEER-PWA")
  if (Test-Path "package-lock.json") {
    npm ci
  } else {
    npm install --no-package-lock
  }
  npm run build
}

Write-Host "== Health check"
$backendRoot = Join-Path $RepoRoot "CRM\\backend"
$backendPid = $null

try {
  Set-Location $backendRoot
  if (Test-Path ".venv\\Scripts\\Activate.ps1") {
    . .\\.venv\\Scripts\\Activate.ps1
  }

  $process = Start-Process -FilePath "python" -ArgumentList @("-m", "uvicorn", "main:app", "--port", "8000") -WorkingDirectory $backendRoot -PassThru -WindowStyle Hidden
  $backendPid = $process.Id

  $health = $null
  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) {
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/health" -TimeoutSec 5
      break
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  if (-not $health) {
    throw "Backend health check timed out after 30s."
  }

  Write-Host "Backend health:" ($health | ConvertTo-Json -Compress)
} finally {
  if ($backendPid) {
    try {
      Stop-Process -Id $backendPid -Force
      Start-Sleep -Seconds 1
    } catch {
      Write-Warning "Failed to stop backend process $backendPid."
    }
  }
}
