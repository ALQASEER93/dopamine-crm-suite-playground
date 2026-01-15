param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$Origin
)

$ErrorActionPreference = 'Stop'

function Write-Fail {
  param([string]$Message)
  Write-Output "FAIL: $Message"
  exit 1
}

if (-not $ApiBaseUrl.StartsWith('https://')) {
  Write-Fail "API base must be HTTPS (got $ApiBaseUrl)."
}

$metaUrl = $ApiBaseUrl.TrimEnd('/') + '/meta/version'
try {
  $meta = Invoke-RestMethod -Uri $metaUrl -TimeoutSec 10 -ErrorAction Stop
} catch {
  Write-Fail "Meta version unreachable at $metaUrl. Check backend HTTPS and routing."
}

if (-not $meta) {
  Write-Fail "Meta version returned empty response."
}

$headers = @{
  'Origin' = $Origin
  'Access-Control-Request-Method' = 'GET'
  'Access-Control-Request-Headers' = 'Authorization,Content-Type'
}

try {
  $resp = Invoke-WebRequest -Uri $metaUrl -Method Options -Headers $headers -TimeoutSec 10 -ErrorAction Stop
} catch {
  Write-Fail "CORS preflight failed. Ensure DPM_CORS_ORIGINS includes $Origin."
}

$allowOrigin = $resp.Headers['Access-Control-Allow-Origin']
$allowMethods = $resp.Headers['Access-Control-Allow-Methods']

if (-not $allowOrigin) {
  Write-Fail "Missing Access-Control-Allow-Origin. Ensure DPM_CORS_ORIGINS includes $Origin."
}

if ($allowOrigin -ne '*' -and $allowOrigin -ne $Origin) {
  Write-Fail "Access-Control-Allow-Origin '$allowOrigin' does not match '$Origin'."
}

if (-not $allowMethods -or $allowMethods -notmatch 'GET') {
  Write-Fail "Access-Control-Allow-Methods does not include GET."
}

Write-Output "PASS: Meta version reachable and CORS preflight allowed for $Origin."
