Cloudflare beta deployment source: deploy/cloudflare-beta.

This commit triggers a NEW GitHub push event for Cloudflare's production-branch integration. Do not retry old builds originally associated with main.

Cloudflare build: bun run build:cloudflare
Deploy: npx wrangler deploy

Before granting testers access, verify Cloudflare Access protection and Supabase build variables.
