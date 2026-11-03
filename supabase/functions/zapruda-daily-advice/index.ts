import { createClient } from "npm:@supabase/supabase-js@2.49.0";
import {
  DEFAULT_PRIMARY,
  DEFAULT_FALLBACK,
  generateYandexAdvice,
  modelUri,
  YandexProviderError,
} from "./yandex-provider.ts";

/**
 * Daily fishing advice via Yandex AI Studio: DeepSeek V4.1 Flash with YandexGPT Pro 5.1 fallback.
 * Secrets: YANDEX_AI_API_KEY, YANDEX_AI_FOLDER_ID, optional YANDEX_AI_WEB_SEARCH_ENABLED.
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const key = anonKey();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const yandex = {
    key: (Deno.env.get("YANDEX_AI_API_KEY") ?? "").trim(),
    folderId: (Deno.env.get("YANDEX_AI_FOLDER_ID") ?? "").trim(),
    primaryModel: (Deno.env.get("YANDEX_AI_PRIMARY_MODEL") ?? DEFAULT_PRIMARY).trim(),
    fallbackModel: (Deno.env.get("YANDEX_AI_FALLBACK_MODEL") ?? DEFAULT_FALLBACK).trim(),
    webSearchEnabled: Deno.env.get("YANDEX_AI_WEB_SEARCH_ENABLED") === "true",
  };

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
  const diagnosticOnly = body.action === "diagnose";
  const staging = supabaseUrl === "https://yudtbifopfnjtjanaqrd.supabase.co";
  if (diagnosticOnly && (!staging || !authData.user.email_confirmed_at)) return respond(404, {});
  if (!diagnosticOnly && location.length < 2)
    return respond(400, { error: "Укажи водоём или место" });

  const adviceDay = moscowAdviceDay();
  const { data: stored, error: storedError } = await userClient
    .from("ai_daily_advices")
    .select("status,attempts,answer,lease_expires_at")
    .eq("user_id", userId)
    .eq("advice_day", adviceDay)
    .maybeSingle();
  const cached =
    stored?.status === "ready" && typeof stored.answer === "string" && stored.answer.length >= 40;
  const failureLimit = stored?.status === "failed" && stored.attempts >= 3;
  const inFlight =
    stored?.status === "pending" && Date.parse(stored.lease_expires_at ?? "") > Date.now();
  if (!diagnosticOnly) {
    if (cached)
      return respond(200, { answer: stored.answer, already_used: true, advice_day: adviceDay });
    if (storedError)
      return respond(503, {
        error: "Журнал ИИ временно недоступен",
        code: "ADVICE_JOURNAL_UNAVAILABLE",
      });
    if (failureLimit)
      return respond(429, {
        error: "Дневной предел неудачных попыток достигнут",
        code: "ADVICE_FAILURE_LIMIT",
        advice_day: adviceDay,
      });
    if (inFlight)
      return respond(409, {
        error: "Запрос уже обрабатывается",
        code: "ADVICE_IN_PROGRESS",
        advice_day: adviceDay,
      });
  }
  // STAGING-only read-only diagnostics never reveal keys or make billable model calls.
  if (diagnosticOnly) {
    let configuration = "ready";
    try {
      if (!yandex.key) throw new Error("YANDEX_KEY_MISSING");
      modelUri(yandex.folderId, yandex.primaryModel);
      modelUri(yandex.folderId, yandex.fallbackModel);
    } catch (err) {
      configuration = err instanceof Error ? err.message : "YANDEX_CONFIGURATION_ERROR";
    }
    return respond(200, {
      diagnostic_only: true,
      provider: "yandex-ai-studio",
      configuration,
      primary_model: yandex.primaryModel,
      fallback_model: yandex.fallbackModel,
      web_search_enabled: yandex.webSearchEnabled,
      quota: storedError
        ? "unknown"
        : cached
          ? "cached"
          : failureLimit
            ? "failed_limit"
            : inFlight
              ? "in_progress"
              : "available",
      advice_day: adviceDay,
    });
  }
  if (!yandex.key)
    return respond(503, { error: "ИИ пока не настроен", code: "YANDEX_KEY_MISSING" });
  try {
    modelUri(yandex.folderId, yandex.primaryModel);
    modelUri(yandex.folderId, yandex.fallbackModel);
  } catch {
    return respond(503, {
      error: "Некорректная настройка модели",
      code: "YANDEX_CONFIGURATION_ERROR",
    });
  }

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
  let usedModel = yandex.primaryModel;
  let providerSource = "yandex-deepseek";
  let webSearch = "disabled";
  let sources: Array<{ title: string; url: string }> = [];
  try {
    const result = await generateYandexAdvice(yandex, {
      systemPrompt,
      userPrompt,
      target,
      timeOfDay,
    });
    answer = result.answer;
    usedModel = result.model;
    providerSource = result.source;
    webSearch = result.webSearch;
    sources = result.sources;
  } catch (err) {
    // Only fixed codes; no provider bodies, keys, input text or credentials in logs.
    const code =
      err instanceof YandexProviderError
        ? err.code
        : err instanceof Error && err.name === "TimeoutError"
          ? "YANDEX_TIMEOUT"
          : "YANDEX_UPSTREAM_ERROR";
    await admin.rpc("complete_ai_daily_advice_slot", {
      p_id: rowId,
      p_lease_token: leaseToken,
      p_success: false,
      p_answer: "",
      p_model: yandex.primaryModel,
      p_error_message: code,
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
      p_model: usedModel,
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
    model: usedModel,
    provider: providerSource,
    web_search: webSearch,
    sources,
  });
});
