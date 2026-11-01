# ZAPRUDA STAGING baseline gate — does NOT connect to either database.
# Validates a private schema-only dump before any manual import.
param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'Schema file not found.' }
$file = Get-Item -LiteralPath $Path
if ($file.Length -lt 1024) { throw 'Schema dump is implausibly small.' }
$raw = Get-Content -LiteralPath $Path -Raw
$dangerous = @(
  '(?im)^\s*(?:COPY\s+[^;]*FROM\s+stdin|INSERT\s+INTO|UPDATE\s+\S+\s+SET|DELETE\s+FROM|TRUNCATE\s+)\b',
  '(?im)^\s*\\connect\s+',
  '(?im)^\s*CREATE\s+(?:ROLE|USER)\b'
)
foreach ($pattern in $dangerous) {
  if ([regex]::IsMatch($raw, $pattern)) { throw 'Review blocked: dump contains data or connection/role operations.' }
}
foreach ($name in @('profiles','fishing_reports','report_private_locations')) {
  if ($raw -notmatch ('(?i)CREATE\s+TABLE\s+(?:public\.)?' + $name + '\b')) {
    throw "Missing required baseline object: $name"
  }
}
Write-Host 'Static schema dump checks passed. This is NOT approval to import.'
Write-Host 'Next: manually review auth/storage dependencies, grants, triggers, function bodies, secrets and RLS.'
Write-Host 'Keep the dump private; never upload it to GitHub or chat.'
