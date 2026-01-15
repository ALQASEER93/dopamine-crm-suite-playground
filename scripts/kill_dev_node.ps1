$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$patterns = @(
  "vite",
  "esbuild",
  "npm run dev",
  "npm run preview",
  "npm run start",
  "ALQASEER-PWA",
  "CRM\\frontend"
)

function Is-DevProcess($proc) {
  if (-not $proc.CommandLine) { return $false }
  foreach ($pattern in $patterns) {
    if ($proc.CommandLine -match [regex]::Escape($pattern)) { return $true }
  }
  return $false
}

Write-Host "Scanning for dev processes (node/esbuild/vite) under repo..."
$candidates = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and (
    $_.Name -match "node|esbuild|vite" -or
    $_.CommandLine -match "node|esbuild|vite"
  )
} | Where-Object { Is-DevProcess $_ }

if (-not $candidates) {
  Write-Host "No matching dev processes found."
  exit 0
}

foreach ($proc in $candidates) {
  Write-Host "Stopping PID $($proc.ProcessId): $($proc.CommandLine)"
  try {
    Stop-Process -Id $proc.ProcessId -Force
  } catch {
    Write-Warning "Failed to stop PID $($proc.ProcessId): $($_.Exception.Message)"
  }
}

Write-Host "Done."
