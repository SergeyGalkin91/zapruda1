import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const result = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: cors });

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return result({ ok: true });
  if (request.method !== "POST") return result({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) return result({ error: "Authentication required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !publicKey || !serviceKey)
    return result({ error: "Server is not configured" }, 503);

  const userClient = createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: identity, error: authError } = await userClient.auth.getUser(jwt);
  if (authError || !identity.user) return result({ error: "Invalid session" }, 401);

  let submissionId = "";
  try {
    const body = await request.json();
    if (typeof body?.submission_id === "string" &&
      /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(body.submission_id))
      submissionId = body.submission_id;
  } catch { /* malformed body */ }
  if (!submissionId) return result({ error: "Valid submission ID required" }, 400);

  const { data: submission, error: submissionError } = await userClient
    .from("admin_inbox_submissions")
    .select("id,user_id,category,subject,body,contact,company,consent_to_contact,delivery_status,created_at")
    .eq("id", submissionId).eq("user_id", identity.user.id).maybeSingle();
  if (submissionError) return result({ error: "Submission lookup failed" }, 500);
  if (!submission) return result({ error: "Not found" }, 404);
  if (submission.delivery_status === "sent")
    return result({ ok: true, status: "sent" });

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const adminChatId = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
  if (!botToken || !adminChatId) return result({ ok: true, status: "queued" });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Only one caller may dispatch a queued submission, even with retries.
  const { data: claimed, error: claimError } = await admin
    .from("admin_inbox_submissions")
    .update({ delivery_status: "processing" })
    .eq("id", submissionId).eq("user_id", identity.user.id)
    .eq("delivery_status", "queued")
    .select("id").maybeSingle();
  if (claimError) return result({ error: "Delivery queue unavailable" }, 503);
  if (!claimed) return result({ ok: true, status: "already_processing" });

  const category = submission.category === "collaboration" ? "🤝 Сотрудничество" : "💡 Предложение по приложению";
  const message = [
    "<b>ZAPRUDA / Заявка № " + escapeHtml(submission.id.slice(0, 8)) + "</b>",
    "<b>Категория:</b> " + category,
    "<b>Тема:</b> " + escapeHtml(submission.subject),
    "<b>Сообщение:</b>\n" + escapeHtml(submission.body),
    submission.company ? "<b>Организация:</b> " + escapeHtml(submission.company) : "",
    submission.consent_to_contact && submission.contact
      ? "<b>Контакт (с разрешения):</b> " + escapeHtml(submission.contact) : "",
    "<b>ID пользователя:</b> <code>" + escapeHtml(submission.user_id) + "</code>",
    "<b>Дата:</b> " + escapeHtml(submission.created_at),
  ].filter(Boolean).join("\n\n");

  try {
    const upstream = await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminChatId, text: message, parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const response = await upstream.json().catch(() => ({}));
    const succeeded = upstream.ok && response.ok === true;
    await admin.from("admin_inbox_submissions")
      .update({ delivery_status: succeeded ? "sent" : "failed" })
      .eq("id", submission.id).eq("delivery_status", "processing");
    return result({ ok: true, status: succeeded ? "sent" : "queued_for_retry" });
  } catch {
    await admin.from("admin_inbox_submissions")
      .update({ delivery_status: "failed" })
      .eq("id", submission.id).eq("delivery_status", "processing");
    return result({ ok: true, status: "queued_for_retry" });
  }
});
