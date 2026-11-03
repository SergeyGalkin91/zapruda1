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
    .replace(/./gs, (character) => {
      const code = character.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13 ? "" : character;
    })
    .trim()
    .slice(0, max);
}

function anonKey(): string {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacy) return legacy;
  try {
    return (
      (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}") as Record<string, string>)
        .default ?? ""
    );
  } catch {
    return "";
  }
}

type XaiRejectionCode =
  | "XAI_INSUFFICIENT_CREDITS"
  | "XAI_INVALID_API_KEY"
  | "XAI_MODEL_UNAVAILABLE"
  | "XAI_ACCESS_DENIED"
  | "XAI_RATE_LIMITED"
  | "XAI_REQUEST_REJECTED"
  | "XAI_PROVIDER_UNAVAILABLE";

class XaiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: XaiRejectionCode,
  ) {
    super(`xAI HTTP ${status}`);
  }
}

async function xaiRejectionCode(response: Response): Promise<XaiRejectionCode> {
  const fallback: XaiRejectionCode =
    response.status === 401
      ? "XAI_INVALID_API_KEY"
      : response.status === 403
        ? "XAI_ACCESS_DENIED"
        : response.status === 404
          ? "XAI_MODEL_UNAVAILABLE"
          : response.status === 429
            ? "XAI_RATE_LIMITED"
            : response.status >= 500
              ? "XAI_PROVIDER_UNAVAILABLE"
              : "XAI_REQUEST_REJECTED";
  // xAI may return HTTP 400 for both key and billing/request failures. Inspect
  // only a bounded JSON error, then discard it. Never log, persist or return it.
  if (![400, 403].includes(response.status)) {
    await response.body?.cancel().catch(() => {});
    return fallback;
  }
  const reader = response.body?.getReader();
  if (!reader) return fallback;
  let finished = false;
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        break;
      }
      size += value.length;
      if (size > 4096) return fallback;
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const payload: unknown = await new Response(bytes).json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return fallback;
    const record = payload as Record<string, unknown>;
    const nested =
      record.error && typeof record.error === "object" && !Array.isArray(record.error)
        ? (record.error as Record<string, unknown>)
        : {};
    const text = [record.code, record.message, record.error, nested.code, nested.message]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .toLowerCase();
    if (
      /insufficient[_ -](?:credits|balance|funds|quota)|no (?:available |remaining )?credits|(?:does not|doesn't|do not|don't) have (?:any )?credits|credit balance (?:is )?(?:empty|exhausted)|spending limit/.test(
        text,
      )
    )
      return "XAI_INSUFFICIENT_CREDITS";
    if (/invalid[_ -](?:api[_ -]?)?key|incorrect api[_ -]?key|malformed api[_ -]?key/.test(text))
      return "XAI_INVALID_API_KEY";
    if (
      /model[_ -](?:not[_ -]found|unavailable|not[_ -]supported)|model.{0,100}(?:does not exist|not found|not available|deprecated|retired)/.test(
        text,
      )
    )
      return "XAI_MODEL_UNAVAILABLE";
    return fallback;
  } catch {
    return fallback;
  } finally {
    if (!finished) await reader.cancel().catch(() => {});
    reader.releaseLock();
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
    const parsed: unknown = await req.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return respond(400, { error: "Некорректное тело запроса" });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return respond(400, { error: "Некорректное тело запроса" });
  }

  const location = sanitize(body.location, 140);
  const target = sanitize(body.target, 80) || "Любой хищник";
  const timeOfDay = sanitize(body.time, 40) || "Утро";
  const notes = sanitize(body.notes, 400);
  if (location.length < 2) return respond(400, { error: "Укажи водоём или место" });

  // Fail closed BEFORE claiming the user's daily slot. Verify the provider key,
  // model access and endpoint with a read-only API call; never disclose secrets.
  // Keep this check scoped to STAGING until the protected E2E proves it.
  if (supabaseUrl === "https://yudtbifopfnjtjanaqrd.supabase.co") {
    let response: Response;
    try {
      response = await fetch(`${apiBase}/models`, {
        headers: { Authorization: `Bearer ${xaiKey}` },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return respond(503, { error: "Не удалось проверить доступ к ИИ", code: "XAI_PROVIDER_UNAVAILABLE" });
    }
    if (!response.ok) {
      const code = await xaiRejectionCode(response);
      return respond(503, { error: "Провайдер ИИ отклонил проверку доступа", code });
    }
    try {
      const payload: unknown = await response.json();
      const models = payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as { data?: Array<{ id?: unknown }> }).data
        : undefined;
      if (!Array.isArray(models) || !models.some((item) => item?.id === model)) {
        return respond(503, { error: "Выбранная модель Grok недоступна этому ключу", code: "XAI_MODEL_UNAVAILABLE" });
      }
    } catch {
      return respond(503, { error: "Не удалось проверить список моделей ИИ", code: "XAI_PROVIDER_UNAVAILABLE" });
    }
  }

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
      throw new XaiHttpError(upstream.status, await xaiRejectionCode(upstream));
    }
    const payload = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    answer = sanitize(payload.choices?.[0]?.message?.content, 8000);
    if (answer.length < 40) throw new Error("Пустой или слишком короткий ответ модели");
  } catch (err) {
    // Only fixed diagnostics may reach the user-readable journal. Provider bodies
    // and arbitrary exception messages can contain credentials or request details.
    const code =
      err instanceof XaiHttpError
        ? err.code
        : err instanceof Error && err.name === "TimeoutError"
          ? "XAI_TIMEOUT"
          : "XAI_UPSTREAM_ERROR";
    const errorMessage = err instanceof XaiHttpError ? `${err.message}; ${code}` : code;
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
      code,
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
