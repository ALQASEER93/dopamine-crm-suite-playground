$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$runDir = Join-Path $root 'docs/_runs'
New-Item -ItemType Directory -Path $runDir -Force | Out-Null

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'

function Get-LanIPv4 {
    $candidates = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
        Where-Object {
            $_.AddressFamily -eq 'InterNetwork' -and
            $_.IPAddressToString -notmatch '^127\.' -and
            $_.IPAddressToString -notmatch '^169\.254\.'
        } |
        Select-Object -First 1

    if ($null -eq $candidates) {
        return '127.0.0.1'
    }

    return $candidates.IPAddressToString
}

function Test-PortAvailable {
    param([int]$Port)
    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        if ($listener) {
            $listener.Stop()
        }
    }
}

$lanIp = Get-LanIPv4
$pwaPort = 5173
while (-not (Test-PortAvailable -Port $pwaPort)) {
    $pwaPort++
}

$apiBase = "http://$lanIp:8000/api/v1"
$envLanPath = Join-Path $root 'ALQASEER-PWA/.env.lan'
$envLanContent = "VITE_API_BASE_URL=$apiBase`n"
Set-Content -Path $envLanPath -Value $envLanContent -Encoding ASCII

$backendOut = Join-Path $runDir "lan_pilot_${timestamp}_backend.log"
$backendErr = Join-Path $runDir "lan_pilot_${timestamp}_backend.err.log"
$pwaOut = Join-Path $runDir "lan_pilot_${timestamp}_pwa.log"
$pwaErr = Join-Path $runDir "lan_pilot_${timestamp}_pwa.err.log"

Write-Host "Starting backend on http://0.0.0.0:8000 ..."
Start-Process -FilePath 'cmd.exe' `
    -ArgumentList @('/c', "set DPM_LAN_IP=$lanIp && python -m uvicorn main:app --host 0.0.0.0 --port 8000") `
    -WorkingDirectory (Join-Path $root 'CRM/backend') `
    -NoNewWindow `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError $backendErr | Out-Null

Write-Host "Starting PWA dev server on http://0.0.0.0:$pwaPort ..."
Start-Process -FilePath 'cmd.exe' `
    -ArgumentList @('/c', "set VITE_API_BASE_URL=$apiBase && npm run dev -- --host 0.0.0.0 --port $pwaPort") `
    -WorkingDirectory (Join-Path $root 'ALQASEER-PWA') `
    -NoNewWindow `
    -RedirectStandardOutput $pwaOut `
    -RedirectStandardError $pwaErr | Out-Null

Write-Host ''
Write-Host 'LAN Pilot URL (phone):'
Write-Host "http://$lanIp:$pwaPort"
Write-Host ''
Write-Host "Logs: $backendOut, $backendErr, $pwaOut, $pwaErr"
