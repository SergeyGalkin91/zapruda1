const PRODUCTION_HOST = "sonvniuwtvzzyuglscah.supabase.co";

type ClientConfiguration = {
  url?: string | undefined;
  publishableKey?: string | undefined;
  hostname?: string | undefined;
  development?: boolean | undefined;
  context?: string | undefined;
};

/** Validate public configuration before constructing a client or sending requests. */
export function validateClientConfiguration(config: ClientConfiguration) {
  const url = config.url?.trim();
  const publishableKey = config.publishableKey?.trim();
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase configuration is missing. Set the project URL and public key explicitly.",
    );
  }
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    throw new Error("Supabase project URL is invalid.");
  }
  if (!["https:", "http:"].includes(target.protocol) || target.username || target.password) {
    throw new Error("Supabase project URL is invalid.");
  }
  if (publishableKey.startsWith("sb_secret_")) {
    throw new Error("A server secret cannot be used in the Supabase browser client.");
  }
  const payload = publishableKey.split(".")[1];
  if (payload) {
    let role: unknown;
    try {
      role = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role;
    } catch {
      // Opaque public keys and CI placeholders are not JWTs.
    }
    if (role === "service_role")
      throw new Error("A server secret cannot be used in the Supabase browser client.");
  }
  const hostname = config.hostname?.toLowerCase() ?? "";
  const local =
    ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname) ||
    hostname.endsWith(".localhost");
  const previewHost = hostname.endsWith("--zapruda1.netlify.app");
  const nonProduction =
    config.development ||
    local ||
    previewHost ||
    ["deploy-preview", "branch-deploy", "dev", "test", "staging"].includes(config.context ?? "");
  if (nonProduction && target.hostname.toLowerCase() === PRODUCTION_HOST) {
    throw new Error("Development and staging must use an isolated Supabase project.");
  }
  return { url: url.replace(/\/+$/, ""), publishableKey };
}
