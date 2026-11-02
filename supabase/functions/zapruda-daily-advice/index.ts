import { createClient } from "npm:@supabase/supabase-js@2.49.0";

/**
 * Daily fishing advice via xAI Grok.
 * Secrets: XAI_API_KEY, optional XAI_MODEL, XAI_API_BASE.
 * Quota claim is atomic via claim_ai_daily_advice_slot / complete_ai_daily_advice_slot.
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
  if (!serviceKey) return respond(503, { error: "Service role not configured" });
  if (!xaiKey) return respond(503, { error: "ИИ-сервис временно недоступен (ключ не настроен)" });
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
  const promptSummary = `${location} · ${target} · ${timeOfDay}`;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: claim, error: claimError } = await admin.rpc("claim_ai_daily_advice_slot", {
    p_user_id: userId,
    p_advice_day: adviceDay,
    p_prompt_summary: promptSummary,
    p_max_failed: 3,
  });

  if (claimError) {
    return respond(500, { error: "Не удалось зарезервировать дневной слот" });
  }

  const claimObj = (claim ?? {}) as {
    ok?: boolean;
    reason?: string;
    answer?: string;
    id?: string;
    lease_token?: string;
  };

  if (!claimObj.ok) {
    if (claimObj.reason === "already_used" && claimObj.answer) {
      return respond(200, {
        answer: claimObj.answer,
        already_used: true,
        advice_day: adviceDay,
      });
    }
    if (claimObj.reason === "too_many_failures") {
      return respond(429, {
        error: "Слишком много неудачных попыток сегодня. Попробуй завтра.",
        advice_day: adviceDay,
      });
    }
    if (claimObj.reason === "lease_held") {
      return respond(409, {
        error: "Запрос уже обрабатывается. Подожди несколько секунд.",
        advice_day: adviceDay,
      });
    }
    return respond(500, { error: "Слот недоступен", reason: claimObj.reason });
  }

  const rowId = claimObj.id;
  const leaseToken = claimObj.lease_token;
  if (!rowId || !leaseToken) {
    return respond(500, { error: "Некорректный lease" });
  }

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
    const errorMessage = sanitize(err instanceof Error ? err.message : "upstream_error", 500);
    await admin.rpc("complete_ai_daily_advice_slot", {
      p_id: rowId,
      p_lease_token: leaseToken,
      p_success: false,
      p_answer: "",
      p_model: model,
      p_error_message: errorMessage,
    });
    return respond(502, {
      error: "ИИ не ответил. Успешный совет не засчитан. Попробуй позже.",
      advice_day: adviceDay,
    });
  }

  const { data: completion, error: completionError } = await admin.rpc(
    "complete_ai_daily_advice_slot",
    {
      p_id: rowId,
      p_lease_token: leaseToken,
      p_success: true,
      p_answer: answer,
      p_model: model,
      p_error_message: "",
    },
  );
  if (completionError || !completion?.ok) {
    return respond(409, {
      error: "Не удалось подтвердить сохранение совета. Повтори запрос позже.",
      advice_day: adviceDay,
    });
  }

  return respond(200, {
    answer,
    already_used: false,
    advice_day: adviceDay,
    model,
  });
});
