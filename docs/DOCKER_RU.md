# ZAPRUDA COMMUNITY — Docker

The Docker image runs the existing React/TanStack Start app with Nitro on Node.js.
The Supabase database and Edge Functions stay hosted in the existing Supabase project.

## Start

1. Install Docker Desktop on Windows and enable the engine.
2. From the repository root, copy `.env.docker.example` to `.env.docker`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` using the **public** URL and **publishable** key from Supabase. **Never use a secret key or service role key**.
4. From a terminal in the repository root, run:

```sh
docker compose --env-file .env.docker up --build -d
```

Open http://localhost:3000 in the browser.

## Useful commands

```sh
docker compose --env-file .env.docker logs -f web
docker compose --env-file .env.docker down
docker image ls zapruda-community
```

## Notes

- The two `VITE_*` values are build-time **public client** configuration. Rebuild if they change.
- No user passwords, Telegram tokens or Supabase service keys belong in the Docker image.
- The container image is local (`zapruda-community:local`), not automatically published to a registry.
- Docker cannot be executed in the assistant's current runtime. GitHub Actions validates the image build; a local smoke test on a Docker-enabled machine is still recommended.
- Map pins are private per user in Supabase and are not stored inside the container.
