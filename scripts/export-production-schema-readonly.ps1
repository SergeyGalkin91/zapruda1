# ZAPRUDA: production SCHEMA ONLY. Never exports table rows, auth users or storage files.
# Requires: Supabase CLI, Docker and operator authentication with READ-ONLY permission.
# Run locally from repository root after reviewing permissions. Never commit the generated dump.
$ErrorActionPreference = 'Stop'
$prod = 'sonvniuwtvzzyuglscah'
$expected = 'EXPORT ZAPRUDA SCHEMA ONLY'
if ($env:ZAPRUDA_SCHEMA_EXPORT_CONFIRM -cne $expected) { throw "Set ZAPRUDA_SCHEMA_EXPORT_CONFIRM exactly to '$expected' before proceeding." }
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) { throw 'Supabase CLI missing. Install and review supabase db dump --help first.' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is required for Supabase CLI db dump.' }
$dir = Join-Path $PWD 'private-schema-export'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$file = Join-Path $dir 'zapruda-production-public-schema.sql'
if (Test-Path $file) { throw 'Export already exists; inspect or move it before rerunning. No overwrite.' }
Write-Host 'Check Supabase CLI flags before linking:'
supabase db dump --help
Write-Host 'Linking to production project for READ-ONLY export. Do not execute db push/reset.'
supabase link --project-ref $prod
supabase db dump --linked --schema public --file $file
if ($LASTEXITCODE -ne 0) { throw 'Schema dump failed.' }
$raw = Get-Content -Raw -Path $file
if ($raw -match '(?im)^\\s*(INSERT\\s+INTO|COPY\\s+[^;]+FROM\\s+stdin|UPDATE\\s+|DELETE\\s+FROM)') { throw 'Possible data statements found; QUARANTINE file, do not upload.' }
Write-Host 'Schema-only public export created locally. It is NOT a complete restore: check auth/storage customizations, grants, bucket configuration and security before staging import.'
Write-Host 'Do not commit or share the dump until it has been reviewed for embedded secrets.'
