$ErrorActionPreference = "Stop"

$ApiBase = $env:API_BASE_URL
if (-not $ApiBase) {
    $ApiBase = "http://127.0.0.1:8000/api/v1"
}
$StatusUrl = "http://127.0.0.1:8000/status"
$HealthUrl = "$ApiBase/health"

$AdminEmail = "admin@example.com"
$AdminPassword = "password"
$RepEmail = "rep@example.com"
$RepPassword = "password"

function Write-Section($title) {
    Write-Host ""
    Write-Host "== $title =="
}

function Test-Backend {
    try {
        $status = Invoke-RestMethod -Uri $StatusUrl -Method Get -TimeoutSec 5
        if ($status.status -ne "ok") {
            throw "Unexpected /status response."
        }
        return $true
    } catch {
        $health = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 5
        if ($health.status -ne "ok") {
            throw "Unexpected /health response."
        }
        return $true
    }
}

function Login($email, $password) {
    $payload = @{ email = $email; password = $password } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$ApiBase/auth/login" -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 10
    if (-not $resp.token) {
        throw "No token returned for $email"
    }
    return $resp.token
}

function Get-FirstRepId($token) {
    $headers = @{ Authorization = "Bearer $token" }
    $reps = Invoke-RestMethod -Uri "$ApiBase/reps" -Headers $headers -TimeoutSec 10
    if ($reps.Count -lt 1) {
        throw "No reps found."
    }
    return $reps[0].id
}

function Get-FirstDoctorId($token) {
    $headers = @{ Authorization = "Bearer $token" }
    $resp = Invoke-RestMethod -Uri "$ApiBase/doctors/?page=1&page_size=1" -Headers $headers -TimeoutSec 10
    if ($resp.data -and $resp.data.Count -gt 0) {
        return $resp.data[0].id
    }
    return $null
}

function Get-FirstPharmacyId($token) {
    $headers = @{ Authorization = "Bearer $token" }
    $resp = Invoke-RestMethod -Uri "$ApiBase/pharmacies/?page=1&page_size=1" -Headers $headers -TimeoutSec 10
    if ($resp.data -and $resp.data.Count -gt 0) {
        return $resp.data[0].id
    }
    return $null
}

function Create-Doctor($token) {
    $headers = @{ Authorization = "Bearer $token" }
    $payload = @{
        name = "Smoke Doctor"
        city = "Cairo"
        specialty = "General"
    } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$ApiBase/doctors/" -Headers $headers -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 10
    return $resp.id
}

function Create-Visit($token, $repId, $doctorId, $pharmacyId) {
    $headers = @{ Authorization = "Bearer $token" }
    $payload = @{
        visit_date = (Get-Date).ToString("yyyy-MM-dd")
        rep_id = $repId
    }
    if ($doctorId) {
        $payload.doctor_id = $doctorId
    } elseif ($pharmacyId) {
        $payload.pharmacy_id = $pharmacyId
    }
    $resp = Invoke-RestMethod -Uri "$ApiBase/visits/" -Headers $headers -Method Post -ContentType "application/json" -Body ($payload | ConvertTo-Json) -TimeoutSec 10
    return $resp.id
}

function Get-Or-Create-VisitId($token) {
    $headers = @{ Authorization = "Bearer $token" }
    $resp = Invoke-RestMethod -Uri "$ApiBase/visits/?status=scheduled&page=1&page_size=1" -Headers $headers -TimeoutSec 10
    if ($resp.data -and $resp.data.Count -gt 0) {
        return $resp.data[0].id
    }
    $repId = Get-FirstRepId $token
    $doctorId = Get-FirstDoctorId $token
    $pharmacyId = $null
    if (-not $doctorId) {
        $pharmacyId = Get-FirstPharmacyId $token
    }
    if (-not $doctorId -and -not $pharmacyId) {
        $doctorId = Create-Doctor $token
    }
    return (Create-Visit $token $repId $doctorId $pharmacyId)
}

function Start-Visit($token, $visitId) {
    $headers = @{ Authorization = "Bearer $token" }
    $payload = @{
        lat = 29.9711
        lng = 31.1385
        accuracy = 5.5
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$ApiBase/visits/$visitId/start" -Headers $headers -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 10
}

function End-Visit($token, $visitId) {
    $headers = @{ Authorization = "Bearer $token" }
    $payload = @{
        lat = 29.9719
        lng = 31.1392
        accuracy = 6.2
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$ApiBase/visits/$visitId/end" -Headers $headers -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 10
}

$summary = [ordered]@{
    backend = $false
    admin_login = $false
    rep_login = $false
    visit_start = $false
    visit_end = $false
}

Write-Section "Backend reachability"
try {
    Test-Backend | Out-Null
    $summary.backend = $true
    Write-Host "[ok] Backend reachable."
} catch {
    Write-Host "[fail] Backend not reachable: $($_.Exception.Message)"
}

Write-Section "Login"
try {
    $adminToken = Login $AdminEmail $AdminPassword
    $summary.admin_login = $true
    Write-Host "[ok] Admin login OK."
} catch {
    Write-Host "[fail] Admin login failed: $($_.Exception.Message)"
}

try {
    $repToken = Login $RepEmail $RepPassword
    $summary.rep_login = $true
    Write-Host "[ok] Rep login OK."
} catch {
    Write-Host "[fail] Rep login failed: $($_.Exception.Message)"
}

Write-Section "Visit GPS start/end"
try {
    if (-not $adminToken) {
        throw "Admin token missing."
    }
    $visitId = Get-Or-Create-VisitId $adminToken
    Start-Visit $adminToken $visitId | Out-Null
    $summary.visit_start = $true
    Write-Host "[ok] Visit start OK (visitId=$visitId)."
    End-Visit $adminToken $visitId | Out-Null
    $summary.visit_end = $true
    Write-Host "[ok] Visit end OK (visitId=$visitId)."
} catch {
    $detail = $null
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $detail = $reader.ReadToEnd()
        } catch {
            $detail = $null
        }
    }
    if ($detail) {
        Write-Host "[fail] Visit start/end failed: $detail"
    } else {
        Write-Host "[fail] Visit start/end failed: $($_.Exception.Message)"
    }
}

Write-Section "Summary"
foreach ($item in $summary.GetEnumerator()) {
    $state = if ($item.Value) { "PASS" } else { "FAIL" }
    Write-Host ("{0,-12} {1}" -f $item.Key, $state)
}

if ($summary.backend -and $summary.admin_login -and $summary.visit_start -and $summary.visit_end) {
    exit 0
}
exit 1
