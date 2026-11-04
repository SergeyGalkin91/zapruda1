# Run from any directory. Secrets stay in the local ignored .env.staging.local file.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $root '.env.staging.local'
if (-not (Test-Path -LiteralPath $envFile)) {
  throw 'Missing .env.staging.local. Use public STAGING Supabase credentials only.'
}
$values = @{}
foreach ($line in (Get-Content -LiteralPath $envFile)) {
  if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) { continue }
  if ($line -match '^\s*([A-Za-z_][A-Za-z_0-9]*)=(.*)$') {
    $values[$matches[1]] = $matches[2].Trim().Trim('"', "'")
  }
}
$expectedUrl = 'https://yudtbifopfnjtjanaqrd.supabase.co'
if ($values['STAGING_SUPABASE_URL'] -ne $expectedUrl) {
  throw 'Refusing Docker startup: STAGING_SUPABASE_URL must match the isolated STAGING project.'
}
$key = $values['STAGING_SUPABASE_PUBLISHABLE_KEY']
if ([string]::IsNullOrWhiteSpace($key) -or $key -match '^sb_secret_' -or $key -match '[<>]') {
  throw 'Refusing startup: provide the public STAGING publishable/anon key, not a secret or placeholder.'
}
$env:STAGING_SUPABASE_URL = $expectedUrl
$env:STAGING_SUPABASE_PUBLISHABLE_KEY = $key
if ($values['ZAPRUDA_GIT_SHA']) { $env:ZAPRUDA_GIT_SHA = $values['ZAPRUDA_GIT_SHA'] }
Push-Location $root
try {
  docker info --format '{{.ServerVersion}}' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Docker daemon is unavailable.' }
  docker compose -f compose.staging.yaml config --quiet
  if ($LASTEXITCODE -ne 0) { throw 'Docker Compose validation failed.' }
  docker compose -f compose.staging.yaml up --build -d
  if ($LASTEXITCODE -ne 0) { throw 'Docker staging build/start failed.' }
  docker compose -f compose.staging.yaml ps
  Write-Host 'STAGING preview: http://127.0.0.1:3080'
} finally {
  Pop-Location
  Remove-Item Env:STAGING_SUPABASE_PUBLISHABLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:STAGING_SUPABASE_URL -ErrorAction SilentlyContinue
}
