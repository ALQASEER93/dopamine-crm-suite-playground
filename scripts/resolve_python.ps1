param(
  [switch]$Quiet
)

function Resolve-PythonCommand {
  $isWindows = $false
  if ($PSVersionTable.Platform -eq "Win32NT") { $isWindows = $true }
  if ($env:OS -like "*Windows*") { $isWindows = $true }

  $candidates = @()
  if ($isWindows) {
    $candidates = @("py -3.11", "py -3", "py", "python")
  } else {
    $candidates = @("python3", "python")
  }

  foreach ($candidate in $candidates) {
    $parts = $candidate -split " "
    $exe = $parts[0]
    $args = @()
    if ($parts.Length -gt 1) {
      $args = $parts[1..($parts.Length - 1)]
    }

    try {
      $null = & $exe @args -c "import sys; print(sys.executable)" 2>$null
      if ($LASTEXITCODE -eq 0) {
        return $candidate
      }
    } catch {
      # ignore and try next
    }
  }

  return $null
}

if ($MyInvocation.InvocationName -ne ".") {
  $resolved = Resolve-PythonCommand
  if (-not $resolved) {
    if (-not $Quiet) {
      Write-Error "No usable Python command found."
    }
    exit 1
  }
  if (-not $Quiet) {
    Write-Output $resolved
  }
}
