$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
if (-not (Test-Path (Join-Path $repoRoot '.git'))) {
  throw "Repo root not found from $PSScriptRoot"
}

$runDir = Join-Path $repoRoot 'docs/_runs'
if (-not (Test-Path $runDir)) {
  New-Item -ItemType Directory -Path $runDir | Out-Null
}

$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$reportPath = Join-Path $runDir "openapi_audit_${ts}.md"

$baseUrl = 'http://127.0.0.1:8000'
$openapiUrl = "$baseUrl/openapi.json"

function Resolve-Schema($schema, $components) {
  if (-not $schema) { return $null }
  if ($schema.'$ref') {
    $refName = $schema.'$ref'.Split('/')[-1]
    return $components.schemas.$refName
  }
  return $schema
}

function Get-RequiredFields($schema, $components) {
  $resolved = Resolve-Schema $schema $components
  if (-not $resolved) { return @() }
  $required = @()
  if ($resolved.required) { $required += $resolved.required }
  if ($resolved.allOf) {
    foreach ($sub in $resolved.allOf) {
      $required += Get-RequiredFields $sub $components
    }
  }
  return $required | Sort-Object -Unique
}

function Get-OperationSchema($pathObj) {
  if ($pathObj.post) { return $pathObj.post.requestBody.content.'application/json'.schema }
  if ($pathObj.put) { return $pathObj.put.requestBody.content.'application/json'.schema }
  return $null
}

$openapi = $null
$openapiError = $null
try {
  $openapi = Invoke-RestMethod -Uri $openapiUrl -TimeoutSec 15
} catch {
  $openapiError = $_.Exception.Message
}

if (-not $openapi) {
  $lines = @()
  $lines += "# OpenAPI Audit"
  $lines += ""
  $lines += "- Timestamp: $ts"
  $lines += "- OpenAPI URL: $openapiUrl"
  $lines += "- Error: $openapiError"
  $lines += ""
  $lines += "## Result"
  $lines += "- Overall: FAIL"
  $lines | Set-Content -Path $reportPath -Encoding UTF8
  Write-Output $reportPath
  exit 1
}
$paths = $openapi.paths.PSObject.Properties.Name

$requiredPaths = @(
  '/api/v1/meta/version',
  '/devices/register',
  '/reps/{id}/tracking-status'
)

$trackingAlias = '/reps/{rep_id}/tracking-status'
$apiPrefix = '/api/v1'

function Test-PathPresent($paths, $path, $alias) {
  if ($paths -contains $path) { return $true }
  if ($alias -and ($paths -contains $alias)) { return $true }
  if (-not $path.StartsWith($apiPrefix)) {
    $prefixed = "$apiPrefix$path"
    if ($paths -contains $prefixed) { return $true }
    if ($alias) {
      $prefixedAlias = "$apiPrefix$alias"
      if ($paths -contains $prefixedAlias) { return $true }
    }
  }
  return $false
}

$missing = @()
foreach ($p in $requiredPaths) {
  $alias = $null
  if ($p -eq '/reps/{id}/tracking-status') { $alias = $trackingAlias }
  $exists = Test-PathPresent $paths $p $alias
  if (-not $exists) { $missing += $p }
}

$startPath = $paths | Where-Object { $_ -match '/visits/.+/start' } | Select-Object -First 1
$endPath = $paths | Where-Object { $_ -match '/visits/.+/end' } | Select-Object -First 1

$startReq = $null
$endReq = $null
$startFields = @()
$endFields = @()
if ($startPath) {
  $startReq = Get-OperationSchema $openapi.paths.$startPath
  $startFields = Get-RequiredFields $startReq $openapi.components
}
if ($endPath) {
  $endReq = Get-OperationSchema $openapi.paths.$endPath
  $endFields = Get-RequiredFields $endReq $openapi.components
}

$hasStartFields = @('lat', 'lng', 'accuracy') | ForEach-Object { $startFields -contains $_ } | Where-Object { $_ -eq $false } | Measure-Object | Select-Object -ExpandProperty Count
$hasEndFields = @('lat', 'lng', 'accuracy') | ForEach-Object { $endFields -contains $_ } | Where-Object { $_ -eq $false } | Measure-Object | Select-Object -ExpandProperty Count
$startOk = ($startPath -and $hasStartFields -eq 0)
$endOk = ($endPath -and $hasEndFields -eq 0)

# Best-effort constraints detection in schema descriptions or field limits.
function Has-ConstraintHint($schema, $components, $keywords) {
  $resolved = Resolve-Schema $schema $components
  if (-not $resolved) { return $false }
  if ($resolved.description) {
    foreach ($kw in $keywords) {
      if ($resolved.description -match [regex]::Escape($kw)) { return $true }
    }
  }
  if ($resolved.properties) {
    foreach ($prop in $resolved.properties.PSObject.Properties) {
      if ($prop.Value.description) {
        foreach ($kw in $keywords) {
          if ($prop.Value.description -match [regex]::Escape($kw)) { return $true }
        }
      }
      if ($prop.Value.maximum) {
        foreach ($kw in $keywords) {
          if ("$($prop.Value.maximum)" -eq $kw) { return $true }
        }
      }
    }
  }
  return $false
}

$constraintOk = $false
if ($startReq -or $endReq) {
  $constraintOk = (Has-ConstraintHint $startReq $openapi.components @('50', '150')) -or (Has-ConstraintHint $endReq $openapi.components @('50', '150'))
}

$pass = ($missing.Count -eq 0) -and $startOk -and $endOk -and $constraintOk
$lines = @()
$lines += "# OpenAPI Audit"
$lines += ""
$lines += "- Timestamp: $ts"
$lines += "- OpenAPI URL: $openapiUrl"
$lines += ""
$lines += "## Required Routes"
foreach ($p in $requiredPaths) {
  $alias = $null
  if ($p -eq '/reps/{id}/tracking-status') { $alias = $trackingAlias }
  $exists = Test-PathPresent $paths $p $alias
  $lines += "- ${p}: " + ($(if ($exists) { 'PASS' } else { 'FAIL' }))
}
$lines += ""
$lines += "## Visit Start/End Schema"
$lines += "- start path: $startPath"
$lines += "- end path: $endPath"
$lines += "- start requires lat/lng/accuracy: " + ($(if ($startOk) { 'PASS' } else { 'FAIL' }))
$lines += "- end requires lat/lng/accuracy: " + ($(if ($endOk) { 'PASS' } else { 'FAIL' }))
$lines += "- accuracy<=50 & geofence<=150 hint: " + ($(if ($constraintOk) { 'PASS' } else { 'FAIL' }))
$lines += ""
$lines += "## Result"
$lines += "- Overall: " + ($(if ($pass) { 'PASS' } else { 'FAIL' }))

$lines | Set-Content -Path $reportPath -Encoding UTF8
Write-Output $reportPath
if (-not $pass) { exit 1 }
