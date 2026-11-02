import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.0";

/**
 * Current weather for report autofill.
 * Secret: OPENWEATHER_API_KEY (or OPENWEATHERMAP_API_KEY).
 * Does not return or persist raw GPS in report_fields.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "private, max-age=300",
};

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: cors });

// Simple per-isolate rate limit (best-effort; not a substitute for gateway limits).
const hits = new Map<string, { n: number; reset: number }>();
function rateLimit(userId: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = hits.get(userId);
  if (!cur || cur.reset < now) {
    hits.set(userId, { n: 1, reset: now + windowMs });
    return true;
  }
  if (cur.n >= max) return false;
  cur.n += 1;
  return true;
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

function hpaToMmHg(hpa: number): number {
  return Math.round(hpa * 0.750061683);
}

const DEG_TO_CARD = [
  "С", "ССВ", "СВ", "ВСВ", "В", "ВЮВ", "ЮВ", "ЮЮВ",
  "Ю", "ЮЮЗ", "ЮЗ", "ЗЮЗ", "З", "ЗСЗ", "СЗ", "ССЗ",
];

function windCardinal(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return "";
  const i = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return DEG_TO_CARD[i];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const key = anonKey();
  const owKey =
    Deno.env.get("OPENWEATHER_API_KEY") ||
    Deno.env.get("OPENWEATHERMAP_API_KEY") ||
    "";

  if (!supabaseUrl || !key) return respond(503, { error: "Backend not configured" });


  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return respond(401, { error: "Войди в ZAPRUDA" });

  const client = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await client.auth.getUser(jwt);
  if (authError || !authData.user || authData.user.is_anonymous) {
    return respond(401, { error: "Войди в ZAPRUDA" });
  }
  if (!owKey) return respond(503, { error: "Погодный сервис не настроен" });

  if (!rateLimit(authData.user.id)) {
    return respond(429, { error: "Слишком много запросов погоды. Подожди минуту." });
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await req.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return respond(400, { error: "Некорректный JSON" });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return respond(400, { error: "Некорректный JSON" });
  }

  const city = String(body.city ?? body.q ?? "").trim().slice(0, 120);
  const hasLat = body.lat != null || body.latitude != null;
  const hasLon = body.lon != null || body.longitude != null;
  if (hasLat !== hasLon) {
    return respond(400, { error: "Укажи оба координаты lat и lon, либо только город" });
  }

  const latRaw = body.lat ?? body.latitude;
  const lonRaw = body.lon ?? body.longitude;
  const lat = latRaw == null || latRaw === "" ? null : Number(latRaw);
  const lon = lonRaw == null || lonRaw === "" ? null : Number(lonRaw);

  const useCoords =
    lat != null &&
    lon != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;

  if (hasLat && hasLon && !useCoords) {
    return respond(400, { error: "Некорректные координаты" });
  }
  if (!useCoords && city.length < 2) {
    return respond(400, { error: "Укажи город или валидные координаты" });
  }

  const params = new URLSearchParams({ units: "metric", lang: "ru", appid: owKey });
  if (useCoords) {
    params.set("lat", String(lat));
    params.set("lon", String(lon));
  } else {
    params.set("q", city);
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`,
      { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "ZaprudaCommunity/1.0" } },
    );
  } catch {
    return respond(502, { error: "Погодный сервис недоступен" });
  }

  if (upstream.status === 401 || upstream.status === 403) {
    return respond(503, { error: "Ключ погоды отклонён" });
  }
  if (upstream.status === 404) {
    return respond(404, { error: "Место не найдено" });
  }
  if (upstream.status === 429) {
    return respond(429, { error: "Лимит OpenWeather. Попробуй позже." });
  }
  if (!upstream.ok) {
    return respond(502, { error: `Погода: HTTP ${upstream.status}` });
  }

  let data: {
    name?: string;
    weather?: Array<{ description?: string }>;
    main?: { temp?: number; pressure?: number; humidity?: number };
    wind?: { speed?: number; deg?: number };
    sys?: { country?: string };
  };
  try {
    const parsed: unknown = await upstream.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return respond(502, { error: "Некорректный ответ погодного сервиса" });
    }
    data = parsed as typeof data;
  } catch {
    return respond(502, { error: "Некорректный ответ погодного сервиса" });
  }

  if (!Number.isFinite(data.main?.temp) || !Number.isFinite(data.main?.pressure)) {
    return respond(502, { error: "Некорректный ответ погодного сервиса" });
  }
  const rawDescription = data.weather?.[0]?.description;
  if (rawDescription != null && typeof rawDescription !== "string") {
    return respond(502, { error: "Некорректный ответ погодного сервиса" });
  }

  const temp = data.main?.temp;
  const pressureHpa = data.main?.pressure;
  const windMs = data.wind?.speed;
  const windDeg = data.wind?.deg;
  const description = (rawDescription ?? "").trim();

  const report_fields = {
    weather_summary: description,
    air_temperature_c: temp != null && Number.isFinite(temp) ? Math.round(temp * 10) / 10 : null,
    pressure_mmhg:
      pressureHpa != null && Number.isFinite(pressureHpa) ? hpaToMmHg(pressureHpa) : null,
    wind_direction: windCardinal(windDeg ?? null),
    wind_speed_ms:
      windMs != null && Number.isFinite(windMs) ? Math.round(windMs * 10) / 10 : null,
  };

  // Intentionally omit lat/lon from response body for privacy.
  return respond(200, {
    city: data.name || city,
    country: data.sys?.country || "",
    description,
    temp: report_fields.air_temperature_c,
    pressure_hpa: pressureHpa ?? null,
    pressure_mmhg: report_fields.pressure_mmhg,
    wind_ms: report_fields.wind_speed_ms,
    wind_direction: report_fields.wind_direction,
    humidity: data.main?.humidity ?? null,
    report_fields,
    source: "OpenWeather",
  });
});
