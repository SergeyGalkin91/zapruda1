import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.0";

/**
 * ZAPRUDA daily fishing advice via xAI Grok.
 * Secrets (Edge only): XAI_API_KEY, optional XAI_MODEL, XAI_API_BASE.
 * Client has SELECT-only on ai_daily_advices; writes use service_role.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: cors });

function moscowAdviceDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function sanitize(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}

function anonKey(): string {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacy) return legacy;
  try {
    return (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}") as Record<string, string>).default ?? "";
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const key = anonKey();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const xaiKey = Deno.env.get("XAI_API_KEY") ?? "";
  const model = Deno.env.get("XAI_MODEL") || "grok-3-mini";
  const apiBase = (Deno.env.get("XAI_API_BASE") || "https://api.x.ai/v1").replace(/\/$/, "");

  if (!supabaseUrl || !key) return respond(503, { error: "Backend not configured" });
  if (!serviceKey) return respond(503, { error: "Service role not configured" });
  if (!xaiKey) return respond(503, { error: "ИИ-сервис временно недоступен (ключ не настроен)" });

  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return respond(401, { error: "Войди в ZAPRUDA" });

  const userClient = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(jwt);
  if (authError || !authData.user || authData.user.is_anonymous) {
    return respond(401, { error: "Войди в ZAPRUDA" });
  }
  const userId = authData.user.id;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return respond(400, { error: "Некорректное тело запроса" });
  }

  const location = sanitize(body.location, 140);
  const target = sanitize(body.target, 80) || "Любой хищник";
  const timeOfDay = sanitize(body.time, 40) || "Утро";
  const notes = sanitize(body.notes, 400);
  if (location.length < 2) return respond(400, { error: "Укажи водоём или место" });

  const adviceDay = moscowAdviceDay();
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await admin
    .from("ai_daily_advices")
    .select("id, status, attempts, answer, prompt_summary")
    .eq("user_id", userId)
    .eq("advice_day", adviceDay)
    .maybeSingle();

  if (existing?.status === "ready" && existing.answer) {
    return respond(200, {
      answer: existing.answer,
      already_used: true,
      advice_day: adviceDay,
    });
  }
  if (existing?.status === "failed" && (existing.attempts ?? 0) >= 3) {
    return respond(429, {
      error: "Слишком много неудачных попыток сегодня. Попробуй завтра.",
      advice_day: adviceDay,
    });
  }

  const promptSummary = `${location} · ${target} · ${timeOfDay}`;
  let rowId = existing?.id as string | undefined;
  const nextAttempts = (existing?.attempts ?? 0) + 1;

  if (!rowId) {
    const { data: inserted, error: insertError } = await admin
      .from("ai_daily_advices")
      .insert({
        user_id: userId,
        advice_day: adviceDay,
        prompt_summary: promptSummary,
        status: "pending",
        attempts: 0,
        model: "",
        answer: "",
        error_message: "",
      })
      .select("id")
      .single();
    if (insertError) {
      // concurrent unique race — re-read
      const { data: raced } = await admin
        .from("ai_daily_advices")
        .select("id, status, attempts, answer")
        .eq("user_id", userId)
        .eq("advice_day", adviceDay)
        .maybeSingle();
      if (raced?.status === "ready" && raced.answer) {
        return respond(200, { answer: raced.answer, already_used: true, advice_day: adviceDay });
      }
      if (!raced?.id) return respond(500, { error: "Не удалось создать запись журнала" });
      rowId = raced.id;
    } else {
      rowId = inserted?.id;
    }
  }

  if (!rowId) return respond(500, { error: "Не удалось создать запись журнала" });

  const systemPrompt =
    "Ты опытный русскоязычный рыболов-наставник ZAPRUDA COMMUNITY. " +
    "Дай один практичный совет на сегодня: куда/как ловить, тактика, снасти, безопасность. " +
    "Не выдумывай точный GPS. Не обещай улов. Ответ 800–1600 символов, без markdown-заголовков.";

  const userPrompt = [
    `Место: ${location}`,
    `Цель: ${target}`,
    `Время суток: ${timeOfDay}`,
    notes ? `Заметки: ${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let answer = "";
  let errorMessage = "";

  try {
    const upstream = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${xaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 900,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      throw new Error(`xAI HTTP ${upstream.status}: ${text.slice(0, 200)}`);
    }
    const payload = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    answer = sanitize(payload.choices?.[0]?.message?.content, 8000);
    if (answer.length < 40) throw new Error("Пустой или слишком короткий ответ модели");
  } catch (err) {
    errorMessage = sanitize(err instanceof Error ? err.message : "upstream_error", 500);
    await admin
      .from("ai_daily_advices")
      .update({
        status: "failed",
        attempts: nextAttempts,
        error_message: errorMessage,
        model,
        prompt_summary: promptSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowId);
    return respond(502, {
      error: "ИИ не ответил. Попытка не засчитывается как успешный совет. Попробуй позже.",
      advice_day: adviceDay,
    });
  }

  await admin
    .from("ai_daily_advices")
    .update({
      status: "ready",
      attempts: nextAttempts,
      answer,
      model,
      prompt_summary: promptSummary,
      error_message: "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", rowId);

  return respond(200, {
    answer,
    already_used: false,
    advice_day: adviceDay,
    model,
  });
});
