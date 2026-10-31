# ZAPRUDA staging bootstrap: export public schema only, NO row data.
# Read-only *operation*, not a guarantee that database credentials lack write privileges.
# Requires an authenticated Supabase CLI and Docker. Do not commit or upload raw dumps.
$ErrorActionPreference = 'Stop'
$project = 'sonvniuwtvzzyuglscah'
if ($env:ZAPRUDA_SCHEMA_EXPORT_CONFIRM -cne 'EXPORT ZAPRUDA SCHEMA ONLY') {
  throw 'Explicit confirmation missing: set ZAPRUDA_SCHEMA_EXPORT_CONFIRM to EXPORT ZAPRUDA SCHEMA ONLY.'
}
foreach ($command in @('supabase', 'docker')) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "Missing prerequisite: $command"
  }
}
$target = Join-Path (Get-Location) 'private-schema-export'
$output = Join-Path $target 'zapruda-production-public-schema.sql'
if (Test-Path $output) { throw 'Existing schema dump detected: will not overwrite it.' }
New-Item -ItemType Directory -Force -Path $target | Out-Null
# --schema public intentionally excludes auth/storage internal schemas.
# Do not run db push/db reset/db diff against production.
Write-Host "Preparing schema-only export from production $project"
supabase db dump --help | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Cannot read supabase db dump help.' }
supabase link --project-ref $project
if ($LASTEXITCODE -ne 0) { throw 'Supabase link failed; nothing exported.' }
try {
  supabase db dump --linked --schema public --file $output
  if ($LASTEXITCODE -ne 0) { throw 'Schema-only export failed.' }
  $raw = Get-Content -LiteralPath $output -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) { throw 'Schema export is empty.' }
  $forbidden = '(?im)^\s*(?:INSERT\s+INTO|COPY\s+\S+\s+FROM\s+stdin|UPDATE\s+\S+\s+SET|DELETE\s+FROM)\b'
  if ([regex]::IsMatch($raw, $forbidden)) {
    throw 'Potential data-modification/data-copy statement detected. Quarantine export; do not share.'
  }
  Write-Host 'Public schema-only export ready for PRIVATE human review.'
  Write-Host 'Still missing: auth triggers, storage schema policies/buckets, grants, secrets review.'
  Write-Host 'Do NOT run this file against staging until a dependency and security audit is complete.'
} catch {
  Write-Warning 'Export failed review; inspect locally and DO NOT upload generated file.'
  throw
}
