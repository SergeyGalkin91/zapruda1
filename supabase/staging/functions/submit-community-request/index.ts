import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.0";

type RequestKind = "improvement" | "cooperation" | "bug";
type RequestBody = {
  request_type?: unknown;
  category?: unknown;
  subject?: unknown;
  body?: unknown;
  contact?: unknown;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function respond(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders });
}

function adminKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
    return keys.default ?? "";
  } catch {
    return "";
  }
}

function publicKey() {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}") as Record<
      string,
      string
    >;
    return keys.default ?? "";
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return respond(405, { error: "Только POST." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  // This reviewed broker belongs only to STAGING; never deploy it as PROD code.
  if (supabaseUrl !== "https://yudtbifopfnjtjanaqrd.supabase.co") {
    return respond(503, { error: "STAGING only" });
  }
  const publishable = publicKey();
  const secret = adminKey();
  if (!supabaseUrl || !publishable || !secret) {
    return respond(503, { error: "Сервис приёма обращений временно недоступен." });
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return respond(401, { error: "Войди в аккаунт ZAPRUDA." });
  }
  const token = authorization.slice(7);
  const userClient = createClient(supabaseUrl, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: identity, error: authError } = await userClient.auth.getUser(token);
  if (
    authError ||
    !identity.user ||
    identity.user.is_anonymous ||
    !identity.user.email_confirmed_at
  ) {
    return respond(401, { error: "Требуется подтверждённый аккаунт ZAPRUDA." });
  }

  const text = await req.text();
  if (text.length > 8_000) return respond(413, { error: "Обращение слишком большое." });
  let payload: RequestBody;
  try {
    payload = JSON.parse(text) as RequestBody;
  } catch {
    return respond(400, { error: "Не удалось прочитать обращение." });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return respond(400, { error: "Не удалось прочитать обращение." });
  }
  const requestType = payload.request_type;
  const category = typeof payload.category === "string" ? payload.category.trim() : "";
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const contact = typeof payload.contact === "string" ? payload.contact.trim() : "";

  if (requestType !== "improvement" && requestType !== "cooperation" && requestType !== "bug") {
    return respond(400, { error: "Выбери тип обращения." });
  }
  if (
    category.length > 80 ||
    subject.length < 4 ||
    subject.length > 120 ||
    body.length < 15 ||
    body.length > 2000 ||
    contact.length > 180
  ) {
    return respond(400, {
      error: "Проверь заголовок (4–120 символов), текст (15–2000) и контактные данные.",
    });
  }

  const admin = createClient(supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // One server-only transaction serializes quota check and save across isolates.
  const inserted = await admin.rpc("submit_community_request_v075", {
    p_user_id: identity.user.id,
    p_request_type: requestType,
    p_category: category,
    p_subject: subject,
    p_body: body,
    p_contact: contact,
  });
  if (inserted.error?.message === "FEEDBACK_RATE_LIMITED") {
    return respond(429, { error: "Лимит обращений достигнут. Попробуй позже." });
  }
  if (inserted.error || typeof inserted.data !== "string") {
    return respond(503, { error: "Не удалось сохранить обращение. Повтори отправку позже." });
  }
  const id = inserted.data;
  // STAGING ISOLATION: explicitly disable outbound Telegram delivery.
  // Test submissions must never notify the real ZAPRUDA admin chat.
  const delivered = false;

  return respond(201, {
    id,
    saved: true,
    telegram_delivered: delivered,
    message: "Обращение сохранено. Команда ZAPRUDA рассмотрит его.",
  });
});
