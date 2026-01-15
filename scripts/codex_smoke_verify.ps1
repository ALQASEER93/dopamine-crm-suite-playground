$ErrorActionPreference = "Stop"

function New-ReportLine([string]$text) {
    $script:ReportLines.Add($text) | Out-Null
}

function Invoke-JsonRequest {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers,
        [object]$Body = $null
    )
    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 6
        return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json
    }
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$runDir = Join-Path $repoRoot "docs\\_runs"
if (-not (Test-Path $runDir)) {
    New-Item -ItemType Directory -Path $runDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = Join-Path $runDir ("smoke_verify_{0}.md" -f $timestamp)
$ReportLines = New-Object System.Collections.Generic.List[string]
$passed = $true

$email = $env:DPM_SMOKE_EMAIL
$password = $env:DPM_SMOKE_PASSWORD
$credentialSource = "env"
if ([string]::IsNullOrWhiteSpace($email) -or [string]::IsNullOrWhiteSpace($password)) {
    $email = "rep1@example.com"
    $password = "Rep12345!"
    $credentialSource = "fallback"
}

New-ReportLine "# Smoke Verify Report"
New-ReportLine ""
New-ReportLine "- Timestamp: $timestamp"
New-ReportLine "- Base URL: http://127.0.0.1:8000/api/v1"
New-ReportLine "- Credential source: $credentialSource"
New-ReportLine "- Login email: $email"
New-ReportLine ""
New-ReportLine "## Checks"

try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/health"
    New-ReportLine "- [x] Health: $($health.status)"
} catch {
    $passed = $false
    New-ReportLine "- [ ] Health: FAILED ($($_.Exception.Message))"
}

try {
    $version = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/meta/version"
    New-ReportLine "- [x] Meta version: $($version.git_commit)"
} catch {
    $passed = $false
    New-ReportLine "- [ ] Meta version: FAILED ($($_.Exception.Message))"
}

$token = $null
$currentUser = $null
try {
    $loginBody = @{ email = $email; password = $password }
    $login = Invoke-JsonRequest -Method "Post" -Url "http://127.0.0.1:8000/api/v1/auth/login" -Headers @{} -Body $loginBody
    $token = $login.token
    if (-not $token) {
        throw "Missing token from login response."
    }
    New-ReportLine "- [x] Login: OK"
} catch {
    $passed = $false
    New-ReportLine "- [ ] Login: FAILED ($($_.Exception.Message))"
}

if ($token) {
    $headers = @{ Authorization = "Bearer $token" }
    try {
        $currentUser = Invoke-JsonRequest -Method "Get" -Url "http://127.0.0.1:8000/api/v1/auth/me" -Headers $headers
        $roleSlug = $currentUser.role.slug
        New-ReportLine "- [x] Current user role: $roleSlug"
    } catch {
        $passed = $false
        New-ReportLine "- [ ] Current user role: FAILED ($($_.Exception.Message))"
    }

    $doctorId = $null
    try {
        $doctorList = Invoke-JsonRequest -Method "Get" -Url "http://127.0.0.1:8000/api/v1/doctors/?page=1&page_size=1" -Headers $headers
        if ($doctorList.data -and $doctorList.data.Count -gt 0) {
            $doctorId = $doctorList.data[0].id
            New-ReportLine "- [x] Found doctor ID: $doctorId"
        } else {
            $doctorPayload = @{ name = "Smoke Doctor $timestamp"; city = "Cairo"; area = "Zamalek" }
            $doctor = Invoke-JsonRequest -Method "Post" -Url "http://127.0.0.1:8000/api/v1/doctors/" -Headers $headers -Body $doctorPayload
            $doctorId = $doctor.id
            New-ReportLine "- [x] Created doctor ID: $doctorId"
        }
    } catch {
        $passed = $false
        New-ReportLine "- [ ] Doctor lookup/create: FAILED ($($_.Exception.Message))"
    }

    $visitId = $null
    if ($doctorId -and $currentUser) {
        try {
            $visitPayload = @{
                visit_date = (Get-Date).ToString("yyyy-MM-dd")
                rep_id = $currentUser.id
                doctor_id = $doctorId
                notes = "codex smoke verify"
                status = "SCHEDULED"
            }
            $visit = Invoke-JsonRequest -Method "Post" -Url "http://127.0.0.1:8000/api/v1/visits/" -Headers $headers -Body $visitPayload
            $visitId = $visit.id
            New-ReportLine "- [x] Visit created: ID $visitId"
        } catch {
            $passed = $false
            New-ReportLine "- [ ] Visit create: FAILED ($($_.Exception.Message))"
        }
    }

    if ($visitId) {
        try {
            $startPayload = @{ lat = 30.0; lng = 31.0; accuracy = 10.0 }
            Invoke-JsonRequest -Method "Post" -Url "http://127.0.0.1:8000/api/v1/visits/$visitId/start" -Headers $headers -Body $startPayload | Out-Null
            New-ReportLine "- [x] Visit start: OK"
        } catch {
            $passed = $false
            New-ReportLine "- [ ] Visit start: FAILED ($($_.Exception.Message))"
        }

        try {
            $endPayload = @{ lat = 30.0; lng = 31.0; accuracy = 10.0; notes = "codex smoke end" }
            Invoke-JsonRequest -Method "Post" -Url "http://127.0.0.1:8000/api/v1/visits/$visitId/end" -Headers $headers -Body $endPayload | Out-Null
            New-ReportLine "- [x] Visit end: OK"
        } catch {
            $passed = $false
            New-ReportLine "- [ ] Visit end: FAILED ($($_.Exception.Message))"
        }
    }

    $roleForExport = $null
    if ($currentUser -and $currentUser.role) {
        $roleForExport = $currentUser.role.slug
    }
    if ($roleForExport -in @("admin", "sales_manager")) {
        try {
            Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8000/api/v1/visits/export" -Headers $headers | Out-Null
            New-ReportLine "- [x] Visits export: OK"
        } catch {
            $status = $null
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                $status = $_.Exception.Response.StatusCode.value__
            }
            if ($status -eq 404) {
                New-ReportLine "- [ ] Visits export: SKIP (endpoint missing)"
            } elseif ($status -eq 403) {
                New-ReportLine "- [ ] Visits export: SKIP (insufficient permissions)"
            } else {
                $passed = $false
                New-ReportLine "- [ ] Visits export: FAILED ($($_.Exception.Message))"
            }
        }
    } else {
        New-ReportLine "- [ ] Visits export: SKIP (role $roleForExport)"
    }
}

New-ReportLine ""
if ($passed) {
    New-ReportLine "## Result"
    New-ReportLine "- PASS"
} else {
    New-ReportLine "## Result"
    New-ReportLine "- FAIL"
}

$ReportLines | Set-Content -Path $reportPath -Encoding UTF8
Write-Host ("REPORT_PATH={0}" -f $reportPath)
