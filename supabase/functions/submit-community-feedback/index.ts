import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function sanitized(text: string, limit: number) {
  return text.trim().slice(0, limit).replace(/[\u0000-\u001f\u007f]/g, " ");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return reply({ error: "Войди в аккаунт ZAPRUDA." }, 401);
  const token = authHeader.slice(7);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return reply({ error: "Сервис временно недоступен." }, 503);

  const client = createClient(url, key, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: identity, error: identityError } = await client.auth.getUser(token);
  if (identityError || !identity.user) return reply({ error: "Нужно повторно войти в аккаунт." }, 401);

  let payload: unknown;
  try { payload = await req.json(); } catch { return reply({ error: "Некорректная форма." }, 400); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return reply({ error: "Некорректная форма." }, 400);
  const item = payload as Record<string, unknown>;
  if (!["collaboration", "improvement"].includes(String(item.category))) {
    return reply({ error: "Неизвестный тип обращения." }, 400);
  }
  if (typeof item.subject !== "string" || typeof item.message !== "string" ||
      (item.contact != null && typeof item.contact !== "string")) return reply({ error: "Заполни поля формы." }, 400);

  const category = item.category as "collaboration" | "improvement";
  const subject = sanitized(item.subject, 141);
  const message = sanitized(item.message, 3001);
  const contact = sanitized((item.contact as string | undefined) || "", 181);
  if (subject.length < 5 || subject.length > 140 || message.length < 20 || message.length > 3000 || contact.length > 180) {
    return reply({ error: "Тема: 5–140 символов; текст: 20–3000 символов." }, 400);
  }

  const { data: saved, error: saveError } = await client.from("community_feedback")
    .insert({ user_id: identity.user.id, category, subject, message, contact })
    .select("id").single();
  if (saveError || !saved) {
    return reply({ error: saveError?.code === "P0001"
      ? "Слишком много обращений. Попробуй позже."
      : "Не удалось сохранить обращение. Попробуй ещё раз." }, 400);
  }

  const botToken = Deno.env.get("ZAPRUDA_TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("ZAPRUDA_TELEGRAM_ADMIN_CHAT_ID");
  // Never send user feedback into the public channel by default.
  // This chat ID must refer to an administrator-only Telegram chat.
  let notified = false;
  if (botToken && chatId) {
    const lines = [
      category === "collaboration" ? "🤝 ZAPRUDA / СОТРУДНИЧЕСТВО" : "💡 ZAPRUDA / ПРЕДЛОЖЕНИЕ",
      "Обращение: " + saved.id,
      "Тема: " + subject,
      "Текст: " + message,
      contact ? "Контакт: " + contact : "Контакт: через профиль ZAPRUDA",
      "Пользователь: " + identity.user.id,
    ];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: lines.join("\n"), disable_web_page_preview: true }),
          signal: controller.signal,
        });
        const outcome = await response.json().catch(() => null);
        notified = response.ok && outcome?.ok === true;
      } finally { clearTimeout(timer); }
    } catch (error) {
      console.error("Telegram delivery unavailable", error instanceof Error ? error.message : "Unknown");
    }
  }
  // Deliberately do not expose bot token or chat ID to frontend users.
  return reply({ ok: true, id: saved.id, notification: notified ? "sent" : "pending" });
});
