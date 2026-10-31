# ZAPRUDA schema-only SQL inspection, NO database access or execution.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/inspect-schema-dump.ps1 -DumpPath C:\\private\\schema.sql
param([Parameter(Mandatory=$true)][string]$DumpPath)
$ErrorActionPreference = 'Stop'
$prod = 'sonvniuwtvzzyuglscah'
$staging = 'yudtbifopfnjtjanaqrd'
$resolved = (Resolve-Path -LiteralPath $DumpPath).Path
if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) { throw 'Dump file not found.' }
if ([IO.Path]::GetExtension($resolved) -ne '.sql') { throw 'Expected .sql file.' }
$sql = [IO.File]::ReadAllText($resolved)
if ([string]::IsNullOrWhiteSpace($sql)) { throw 'Empty SQL file.' }
# Conservative text screening: it intentionally may flag safe strings/comments.
$checks = [ordered]@{
  'Row COPY (forbidden)' = '(?im)^\s*COPY\s+.+\s+FROM\s+stdin\s*;'
  'Row INSERT (forbidden)' = '(?im)^\s*INSERT\s+INTO\b'
  'Row UPDATE (forbidden)' = '(?im)^\s*UPDATE\s+\S+\s+SET\b'
  'Row DELETE (forbidden)' = '(?im)^\s*DELETE\s+FROM\b'
  'Truncate (forbidden)' = '(?im)^\s*TRUNCATE\b'
  'Database role changes (review)' = '(?im)^\s*(?:CREATE|ALTER|DROP)\s+ROLE\b'
  'Managed schema DDL (review)' = '(?im)^\s*(?:CREATE|ALTER|DROP)\s+(?:TABLE|SCHEMA|FUNCTION|TRIGGER|POLICY)\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(?:"?(?:auth|storage|supabase_migrations)"?\.)'
  'Explicit production ref (review)' = [regex]::Escape($prod)
  'Explicit staging ref (review)' = [regex]::Escape($staging)
}
$hits = @()
foreach ($name in $checks.Keys) {
  $count = [regex]::Matches($sql, $checks[$name]).Count
  if ($count -gt 0) { $hits += [pscustomobject]@{ Check=$name; Hits=$count } }
}
Write-Host ('Scanned SQL file: ' + [IO.Path]::GetFileName($resolved))
Write-Host ('Bytes: ' + (Get-Item -LiteralPath $resolved).Length)
Write-Host ('CREATE TABLE statements (approximate): ' + [regex]::Matches($sql,'(?im)^\s*CREATE\s+TABLE\b').Count)
Write-Host ('CREATE FUNCTION statements (approximate): ' + [regex]::Matches($sql,'(?im)^\s*CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b').Count)
if ($hits.Count) { $hits | Format-Table -AutoSize } else { Write-Host 'No screening patterns matched.' }
Write-Host 'No SQL executed. Screening is NOT a security audit or restore authorization.'
if ($hits | Where-Object { $_.Check -like '*(forbidden)' }) { throw 'Potential row-data or destructive SQL found. Do not restore.' }
Write-Host 'Next: qualified manual review of all SQL, dependencies, credentials, grants and managed schemas.'
