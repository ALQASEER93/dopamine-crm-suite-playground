Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = "D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND"
$backend = Join-Path $root "CRM\backend"
$frontend = Join-Path $root "CRM\frontend"

$results = [ordered]@{
    BackendPytest = $null
    FrontendLint  = $null
    FrontendBuild = $null
}

function Get-ExitCode {
    param([int]$Default = 0)
    if ($global:LASTEXITCODE -is [int]) { return $global:LASTEXITCODE }
    return $Default
}

function Run-BackendTests {
    param(
        [string]$BackendPath
    )

    $venvPath = Join-Path $BackendPath ".venv"

    if ((Test-Path $BackendPath) -and (Test-Path $venvPath)) {
        Push-Location $BackendPath
        try {
            Write-Host "=== BACKEND: Activating venv and running pytest ==="
            $global:LASTEXITCODE = 0
            & ".\.venv\Scripts\Activate.ps1"
            if (Get-ExitCode -Default 0 -ne 0) {
                Write-Warning "Failed to activate venv. Exit code: $(Get-ExitCode -Default 0)"
            }
            $global:LASTEXITCODE = 0
            pytest -q
            $exitCode = Get-ExitCode -Default 0
            Write-Host "Backend pytest exit code: $exitCode"
            return $exitCode
        } catch {
            Write-Warning "Backend pytest failed: $_"
            return (Get-ExitCode -Default 1)
        } finally {
            Pop-Location
        }
    } else {
        Write-Warning "Backend path or .venv missing: $BackendPath"
        return -1
    }
}

function Run-FrontendCommand {
    param(
        [string]$FrontendPath,
        [string]$CommandName
    )

    if (-not (Test-Path $FrontendPath)) {
        Write-Warning "Frontend path missing: $FrontendPath"
        return -1
    }

    Push-Location $FrontendPath
    try {
        if ($CommandName -eq "lint") {
            Write-Host "=== FRONTEND: npm run lint ==="
            $global:LASTEXITCODE = 0
            npm run lint
        } elseif ($CommandName -eq "build") {
            Write-Host "=== FRONTEND: npm run build ==="
            $global:LASTEXITCODE = 0
            npm run build
        } else {
            Write-Warning "Unknown frontend command: $CommandName"
            return -1
        }
        $exitCode = Get-ExitCode -Default 0
        Write-Host "Frontend $CommandName exit code: $exitCode"
        return $exitCode
    } catch {
        Write-Warning "Frontend $CommandName failed: $_"
        return (Get-ExitCode -Default 1)
    } finally {
        Pop-Location
    }
}

Write-Host "===== RUNNING LOCAL TEST SUITE ====="

$results["BackendPytest"] = Run-BackendTests -BackendPath $backend
$results["FrontendLint"]  = Run-FrontendCommand -FrontendPath $frontend -CommandName "lint"
$results["FrontendBuild"] = Run-FrontendCommand -FrontendPath $frontend -CommandName "build"

Write-Host ""
Write-Host "===== LOCAL TEST SUMMARY ====="
$results.GetEnumerator() | ForEach-Object {
    Write-Host ("{0,-15}: {1}" -f $_.Key, $_.Value)
}

$overallExit = 0
foreach ($v in $results.Values) {
    if ($v -is [int] -and $v -ne 0) {
        $overallExit = 1
    }
}

Write-Host ""
Write-Host "Overall exit code: $overallExit"
exit $overallExit
