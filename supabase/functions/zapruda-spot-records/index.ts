/**
 * ZAPRUDA COMMUNITY v0.7.5 SPOT — STAGING Edge gateway.
 * Authenticated user-scoped RPC, private evidence upload and moderator decisions.
 * Never use client-supplied owner_id / verified / location claims for authorization.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKET = "zc-spot-evidence-staging";

function trustedOrigin(origin: string | null): boolean {
  if (!origin) return true; // mobile/server clients authenticate by JWT
  try {
    const parsed = new URL(origin);
    return (
      (parsed.hostname === "localhost" && /^http:$/.test(parsed.protocol)) ||
      (parsed.protocol === "https:" &&
        /^deploy-preview-[0-9]+--zapruda1\.netlify\.app$/.test(parsed.hostname))
    );
  } catch {
    return false;
  }
}
function respond(body: unknown, status = 200, origin: string | null = null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (origin && trustedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  }
  return new Response(JSON.stringify(body), { status, headers });
}
function asText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
function validImageBytes(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") {
    return [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  }
  if (mime === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (!trustedOrigin(origin)) return respond({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin ?? "",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        Vary: "Origin",
      },
    });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405, origin);
  if (!URL || !ANON || !SERVICE) return respond({ error: "Backend unavailable" }, 503, origin);
  const header = req.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+$/.test(header))
    return respond({ error: "Authentication required" }, 401, origin);
  const token = header.replace(/^Bearer\s+/, "");
  const userClient = createClient(URL, ANON, {
    global: { headers: { Authorization: header } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(token);
  if (authError || !user || !user.email_confirmed_at) {
    return respond({ error: "Confirmed account required" }, 401, origin);
  }
  const admin = createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (
      !contentType.startsWith("multipart/form-data") &&
      !contentType.startsWith("application/json")
    ) {
      return respond({ error: "Unsupported request" }, 415, origin);
    }
    if (contentType.startsWith("multipart/form-data")) {
      const form = await req.formData();
      if (asText(form.get("action")) !== "submit") {
        return respond({ error: "Unknown action" }, 400, origin);
      }
      const file = form.get("photo");
      if (!(file instanceof File) || file.size < 200 || file.size > 12 * 1024 * 1024) {
        return respond({ error: "Photo must be between 200 bytes and 12 MiB" }, 400, origin);
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return respond({ error: "Only JPEG, PNG or WebP" }, 400, origin);
      }
      const buf = new Uint8Array(await file.arrayBuffer());
      if (!validImageBytes(buf, file.type))
        return respond({ error: "Invalid image signature" }, 400, origin);
      const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const storageKey = user.id + "/" + crypto.randomUUID() + "." + ext;
      const { error: uploadErr } = await admin.storage.from(BUCKET).upload(storageKey, buf, {
        contentType: file.type,
        upsert: false,
        cacheControl: "0",
      });
      if (uploadErr) return respond({ error: "Could not store private evidence" }, 502, origin);
      const toNum = (name: string) => Number(asText(form.get(name)));
      const captured = asText(form.get("captured_at"));
      const args = {
        p_spot_id: asText(form.get("spot_id")),
        p_league: asText(form.get("league")),
        p_species: asText(form.get("species")).toLowerCase(),
        p_weight_g: toNum("weight_g"),
        p_length_mm: toNum("length_mm"),
        p_captured_at: captured,
        p_storage_key: storageKey,
      };
      const { data, error } = await userClient.rpc("zc_spot_submit", args);
      if (error) {
        await admin.storage.from(BUCKET).remove([storageKey]);
        return respond({ error: "Record submission rejected", detail: error.message }, 400, origin);
      }
      return respond({ status: "pending", catch_id: data }, 201, origin);
    }
    const body = (await req.json()) as Record<string, unknown>;
    const action = body["action"];
    if (action === "mine") {
      const { data, error } = await userClient.rpc("zc_spot_my_catches");
      return error
        ? respond({ error: "Cannot read catches" }, 403, origin)
        : respond({ catches: data }, 200, origin);
    }
    if (action === "queue") {
      const { data, error } = await userClient.rpc("zc_spot_moderation_queue");
      return error
        ? respond({ error: "Moderator access required" }, 403, origin)
        : respond({ queue: data }, 200, origin);
    }
    if (action === "review") {
      const id = body["catch_id"];
      const decision = body["decision"];
      if (
        typeof id !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(id) ||
        (decision !== "verified" && decision !== "rejected")
      ) {
        return respond({ error: "Invalid moderation request" }, 400, origin);
      }
      const { data, error } = await userClient.rpc("zc_spot_review", {
        p_catch_id: id,
        p_decision: decision,
        p_lawful: body["lawful"] === true,
        p_ul_gear_valid: body["ul_gear_valid"] === true,
        p_micro_welfare_valid: body["micro_welfare_valid"] === true,
      });
      return error
        ? respond({ error: "Review failed", detail: error.message }, 403, origin)
        : respond({ review: data }, 200, origin);
    }
    if (action === "evidence") {
      const catchId = body["catch_id"];
      if (typeof catchId !== "string" || !/^[0-9a-f-]{36}$/i.test(catchId)) {
        return respond({ error: "Invalid catch ID" }, 400, origin);
      }
      // This SECURITY DEFINER RPC checks the authenticated user's moderator role.
      const { data: key, error: roleError } = await userClient.rpc("zc_spot_evidence_key", {
        p_catch_id: catchId,
      });
      if (roleError || typeof key !== "string") {
        return respond({ error: "Moderator evidence access denied" }, 403, origin);
      }
      const { data: signed, error: signError } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(key, 60);
      return signError || !signed?.signedUrl
        ? respond({ error: "Evidence unavailable" }, 503, origin)
        : respond({ url: signed.signedUrl, expires_in: 60 }, 200, origin);
    }
    if (action === "subscribe" || action === "unsubscribe") {
      const spotId = body["spot_id"];
      if (typeof spotId !== "string" || !/^[0-9a-f-]{36}$/i.test(spotId)) {
        return respond({ error: "Invalid spot ID" }, 400, origin);
      }
      if (action === "subscribe") {
        const { error } = await userClient
          .from("zc_spot_subscriptions")
          .upsert({ user_id: user.id, spot_id: spotId }, { onConflict: "user_id,spot_id", ignoreDuplicates: true });
        return error
          ? respond({ error: "Subscription denied" }, 400, origin)
          : respond({ subscribed: true }, 200, origin);
      }
      const { error } = await userClient
        .from("zc_spot_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("spot_id", spotId);
      return error
        ? respond({ error: "Unsubscribe failed" }, 400, origin)
        : respond({ subscribed: false }, 200, origin);
    }
    if (action === "inbox") {
      const { data, error } = await userClient
        .from("zc_spot_notifications")
        .select("id,message,created_at,read_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return error
        ? respond({ error: "Inbox unavailable" }, 403, origin)
        : respond({ notifications: data }, 200, origin);
    }
    return respond({ error: "Unknown action" }, 400, origin);
  } catch {
    return respond({ error: "Invalid request" }, 400, origin);
  }
});
