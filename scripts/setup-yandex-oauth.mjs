/**
 * One-time administrative setup of Yandex OAuth2 for ZAPRUDA.
 * Run locally only, never in browser or on a public server.
 * Requires env SUPABASE_URL, SUPABASE_SECRET_KEY, YANDEX_CLIENT_ID, YANDEX_CLIENT_SECRET.
 * Do not commit secrets or place them in VITE_* variables.
 */
import { createClient } from "@supabase/supabase-js";

const required = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "YANDEX_CLIENT_ID", "YANDEX_CLIENT_SECRET"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error("Missing private environment variables:", missing.join(", "));
  process.exit(1);
}
const key = process.env.SUPABASE_SECRET_KEY.trim();
if (!/^sb_secret_[A-Za-z0-9_-]+$/.test(key) && !/^eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/.test(key)) {
  console.error("Supabase admin key invalid: expected sb_secret_... or legacy service_role JWT. No request sent.");
  process.exit(1);
}
for (const field of ["YANDEX_CLIENT_ID", "YANDEX_CLIENT_SECRET"]) {
  if (/[\\r\\n\\x00-\\x1f]/.test(process.env[field])) {
    console.error(field + " contains control characters. No request sent.");
    process.exit(1);
  }
}
const client = createClient(process.env.SUPABASE_URL.trim(), key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
let data, error;
try {
  ({ data, error } = await client.auth.admin.customProviders.createProvider({
  provider_type: "oauth2",
  identifier: "custom:yandex",
  name: "Яндекс ID",
  client_id: process.env.YANDEX_CLIENT_ID,
  client_secret: process.env.YANDEX_CLIENT_SECRET,
  authorization_url: "https://oauth.yandex.ru/authorize",
  token_url: "https://oauth.yandex.ru/token",
  userinfo_url: "https://login.yandex.ru/info",
  scopes: ["login:email", "login:info"],
  email_optional: false,
  }));
} catch (err) {
  console.error("Provider request failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
}
if (error) {
  console.error("Yandex provider setup failed:", error.message);
  process.exit(1);
}
console.log("Custom OAuth provider created. Verify userinfo compatibility in an actual sign-in before enabling the website button.");
console.log("Provider:", data?.identifier ?? "custom:yandex");
