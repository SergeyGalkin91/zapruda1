# Local ZAPRUDA v0.7.0 STAGING Docker preview

This configuration is for a **local** container bound to localhost:3080. It does not publish an image or deploy to Supabase. The STAGING database currently has no application schema; authenticated app features cannot be verified until its schema is restored safely.

Prerequisites: Docker Desktop, checkout of the PR #14 branch and a private file named `.env.staging.local` **outside Git tracking** with:

```dotenv
STAGING_SUPABASE_URL=https://yudtbifopfnjtjanaqrd.supabase.co
STAGING_SUPABASE_PUBLISHABLE_KEY=<STAGING publishable/anon key, NEVER a service-role key>
ZAPRUDA_GIT_SHA=<actual checked out commit SHA>
```

Recommended Windows launch (checks the exact STAGING project URL and rejects obvious secret-key formats before running Docker):

```powershell
.\scripts\start-staging-docker.ps1
```

Manual alternative from the repository root:

```powershell
docker compose --env-file .env.staging.local -f compose.staging.yaml config --quiet
docker compose --env-file .env.staging.local -f compose.staging.yaml up --build -d
docker compose --env-file .env.staging.local -f compose.staging.yaml ps
```

Preview: http://127.0.0.1:3080 . To stop: `docker compose --env-file .env.staging.local -f compose.staging.yaml down`.

Guardrails:
- Do **not** set the production project URL `sonvniuwtvzzyuglscah` in the staging environment.
- No database password, personal access token or service_role key is needed for this frontend container.
- Vite's public URL and publishable key become embedded in client assets. Use only public STAGING credentials.
- Never commit `.env.staging.local` or build the image with production secrets.
- Docker CI uses placeholders only to smoke test the runtime. It is not an authenticated STAGING integration test.
- Main, production and release tags stay unchanged pending owner approval.
