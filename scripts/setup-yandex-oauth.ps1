#requires -version 5.1
# Run from the ZAPRUDA project folder: powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-yandex-oauth.ps1
$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $PSScriptRoot "setup-yandex-oauth.mjs"
if (-not (Test-Path $scriptPath)) { throw "Missing setup-yandex-oauth.mjs. Download the current script from GitHub." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is not available in PATH." }
function Ask-Secret([string] $title) {
  $secure = Read-Host $title -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr).Trim() }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
try {
  $env:SUPABASE_URL = "https://sonvniuwtvzzyuglscah.supabase.co"
  $env:SUPABASE_SECRET_KEY = Ask-Secret "Supabase Secret Key (sb_secret_...)"
  if (-not $env:SUPABASE_SECRET_KEY.StartsWith("sb_secret_")) {
    throw "Wrong Supabase key format. Expected Secret key starting sb_secret_ (not publishable). No request sent."
  }
  $env:YANDEX_CLIENT_ID = Ask-Secret "Yandex Client ID"
  $env:YANDEX_CLIENT_SECRET = Ask-Secret "Yandex Client Secret (rotated)"
  if (-not $env:YANDEX_CLIENT_ID -or -not $env:YANDEX_CLIENT_SECRET) {
    throw "Yandex values are empty. No request sent."
  }
  & node $scriptPath
  if ($LASTEXITCODE -ne 0) { throw "Provider setup did not complete. Read the message above; do not repeat the key-entry loop." }
} finally {
  Remove-Item Env:\SUPABASE_SECRET_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:\YANDEX_CLIENT_ID -ErrorAction SilentlyContinue
  Remove-Item Env:\YANDEX_CLIENT_SECRET -ErrorAction SilentlyContinue
}
