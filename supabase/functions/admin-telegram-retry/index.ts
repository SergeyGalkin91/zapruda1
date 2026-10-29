import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const respond = (status: number, data: object) =>
  new Response(JSON.stringify(data), { status, headers: cors });
function envKey(primary: string, fallback: string) {
  const legacy = Deno.env.get(primary);
  if (legacy) return legacy;
  try {
    const parsed = JSON.parse(Deno.env.get(fallback) ?? "{}");
    return typeof parsed.default === "string" ? parsed.default : "";
  } catch { return ""; }
}
function sanitize(s: unknown, limit = 2500) {
  return String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, limit);
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed" });

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = envKey("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEYS");
  const secret = envKey("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEYS");
  const authorization = req.headers.get("Authorization") ?? "";
  if (!url || !anon || !secret) return respond(503, { error: "Сервер не настроен." });
  if (!authorization.startsWith("Bearer ")) return respond(401, { error: "Необходима авторизация." });

  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = authorization.slice(7);
  const { data: identity, error: authError } = await client.auth.getUser(token);
  if (authError || !identity.user || identity.user.is_anonymous)
    return respond(401, { error: "Недействительная сессия." });
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: member, error: memberError } = await admin.from("zapruda_admins")
    .select("user_id").eq("user_id", identity.user.id).maybeSingle();
  if (memberError || !member) return respond(403, { error: "Только для администратора ZAPRUDA." });

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
  if (!botToken || !chatId) return respond(503, { error: "Telegram-бот или закрытый чат ещё не настроен." });

  let id = "";
  try {
    const body = await req.json();
    if (typeof body?.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id)) id = body.id;
  } catch { /* bad body */ }
  if (!id) return respond(400, { error: "Нужен ID обращения." });

  const { data: record, error: readError } = await admin.from("community_requests")
    .select("id,request_type,subject,body,category,contact,user_id,telegram_status,telegram_attempts,created_at")
    .eq("id", id).maybeSingle();
  if (readError || !record) return respond(404, { error: "Обращение не найдено." });
  if (record.telegram_status === "sent") return respond(200, { status: "sent" });
  if (record.telegram_attempts >= 3) return respond(429, { error: "Лимит повторов исчерпан." });
  // Atomic conditional claim: concurrent requests cannot send the same row twice.
  const { data: claimed, error: claimError } = await admin.from("community_requests")
    .update({
      telegram_status: "processing",
      telegram_attempts: record.telegram_attempts + 1,
    }).eq("id", id).eq("telegram_status", record.telegram_status)
      .eq("telegram_attempts", record.telegram_attempts)
      .select("id").maybeSingle();
  if (claimError || !claimed) return respond(409, { error: "Обращение уже обрабатывается." });

  const message = [
    "🎣 ZAPRUDA / " + (record.request_type === "cooperation" ? "СОТРУДНИЧЕСТВО" :
      record.request_type === "bug" ? "ОШИБКА" : "УЛУЧШЕНИЕ"),
    "Тема: " + sanitize(record.subject, 130),
    "Раздел: " + sanitize(record.category, 80),
    "Сообщение: " + sanitize(record.body),
    record.contact ? "Контакт: " + sanitize(record.contact, 180) : "",
    "ID обращения: " + record.id,
  ].filter(Boolean).join("\n\n").slice(0, 3900);

  let delivered = false;
  try {
    const answer = await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(7000),
    });
    const data = await answer.json().catch(() => null);
    delivered = answer.ok && data?.ok === true;
  } catch { /* delivery failure retained */ }

  const { error: writeError } = await admin.from("community_requests").update({
    telegram_status: delivered ? "sent" : "failed",
    telegram_sent_at: delivered ? new Date().toISOString() : null,
  }).eq("id", id).eq("telegram_status", "processing");
  if (writeError) return respond(503, { error: "Статус доставки не сохранился." });
  return respond(delivered ? 200 : 502, { status: delivered ? "sent" : "failed" });
});
