param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Stop-Locks {
  Get-Process node,vite,esbuild -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

function Remove-DirSafe([string]$p) {
  if (-not (Test-Path $p)) { return }
  for ($i=1; $i -le 6; $i++) {
    try {
      Remove-Item $p -Recurse -Force -ErrorAction Stop
      return
    } catch {
      Stop-Locks
      Start-Sleep -Milliseconds (250 * $i)
      if ($i -eq 6) { throw }
    }
  }
}

function Step([string]$name, [scriptblock]$sb) {
  Write-Host ""
  Write-Host "=============================="
  Write-Host $name
  Write-Host "=============================="
  & $sb
  if ($LASTEXITCODE -ne 0) { throw "FAILED: $name (exit=$LASTEXITCODE)" }
}

$repo = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "Repo: $repo"
Write-Host ("Node: " + (node -v))
Write-Host ("NPM : " + (npm -v))

# --- CRM Frontend ---
$crmFe = Join-Path $repo "CRM\frontend"
Set-Location $crmFe
Stop-Locks
Remove-DirSafe "node_modules"
Remove-DirSafe ".vite"
Remove-DirSafe "dist"
Step "CRM Frontend | npm ci" { npm ci }
Step "CRM Frontend | npm run build" { npm run build }
if (-not (Test-Path ".\dist\index.html")) { throw "CRM Frontend dist missing!" }

# --- ALQASEER-PWA ---
$pwa = Join-Path $repo "ALQASEER-PWA"
Set-Location $pwa
Stop-Locks
Remove-DirSafe "node_modules"
Remove-DirSafe ".vite"
Remove-DirSafe "dist"

# Force devDependencies even if NODE_ENV=production / omit=dev
$env:NODE_ENV = "development"
Step "ALQASEER-PWA | npm ci --include=dev" { npm ci --include=dev }
Step "ALQASEER-PWA | npm run build" { npm run build }
if (-not (Test-Path ".\dist\index.html")) { throw "PWA dist missing!" }

# Sanity checks
Step "Check Vite exists in PWA" { powershell -NoProfile -Command "if (!(Test-Path '.\node_modules\vite\bin\vite.js')) { exit 1 }" }

Write-Host ""
Write-Host " SUCCESS: Both builds completed."
Write-Host "CRM Frontend dist: $crmFe\dist"
Write-Host "PWA dist:          $pwa\dist"
Write-Host ""
Write-Host "Next optional step (servers): run tools\\CODEX_start_servers.ps1 (created in the next task)."
