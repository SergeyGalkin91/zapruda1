import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.0";

/**
 * Current weather for report autofill / briefs.
 * Secret: OPENWEATHER_API_KEY (or OPENWEATHERMAP_API_KEY).
 * Does not persist GPS; response only returns fields needed for forms.
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
  if (!owKey) return respond(503, { error: "Погодный сервис не настроен" });

  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return respond(401, { error: "Войди в ZAPRUDA" });

  const client = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await client.auth.getUser(jwt);
  if (authError || !authData.user || authData.user.is_anonymous) {
    return respond(401, { error: "Войди в ZAPRUDA" });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return respond(400, { error: "Некорректное тело запроса" });
  }

  const city = String(body.city ?? body.q ?? "").trim().slice(0, 120);
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
  if (!upstream.ok) {
    return respond(502, { error: `Погода: HTTP ${upstream.status}` });
  }

  const data = (await upstream.json()) as {
    name?: string;
    weather?: Array<{ description?: string }>;
    main?: { temp?: number; pressure?: number; humidity?: number };
    wind?: { speed?: number; deg?: number };
    sys?: { country?: string };
    coord?: { lat?: number; lon?: number };
  };

  const temp = data.main?.temp;
  const pressureHpa = data.main?.pressure;
  const windMs = data.wind?.speed;
  const windDeg = data.wind?.deg;
  const description = (data.weather?.[0]?.description || "").trim();

  // report_fields: no raw GPS required for form autofill privacy policy
  const report_fields = {
    weather_summary: description,
    air_temperature_c: temp != null ? Math.round(temp * 10) / 10 : null,
    pressure_mmhg: pressureHpa != null ? hpaToMmHg(pressureHpa) : null,
    wind_direction: windCardinal(windDeg ?? null),
    wind_speed_ms: windMs != null ? Math.round(windMs * 10) / 10 : null,
  };

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
