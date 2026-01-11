$ErrorActionPreference = 'Stop'

$repoRoot = "D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND"
$nodePath = (Get-Command node).Source
$npmCache = Join-Path $env:LOCALAPPDATA 'npm-cache'

Write-Host "Allow-listing Defender exclusions for build tools..."
Add-MpPreference -ExclusionPath $repoRoot
if (Test-Path $npmCache) {
  Add-MpPreference -ExclusionPath $npmCache
}
Add-MpPreference -ExclusionProcess $nodePath

$esbuildPaths = Get-ChildItem -Path $repoRoot -Recurse -Filter esbuild.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
foreach ($esbuild in $esbuildPaths) {
  Add-MpPreference -ExclusionProcess $esbuild
}

$mpStatus = Get-MpComputerStatus
if ($mpStatus.EnableControlledFolderAccess -eq 1) {
  Add-MpPreference -ControlledFolderAccessAllowedApplications $nodePath
}

Write-Host "Done. Requires running PowerShell as Administrator."
