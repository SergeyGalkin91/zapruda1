/** OpenWeather unit conversions used by report autofill. */

export function hpaToMmHg(hpa: number): number {
  return Math.round(hpa * 0.750061683);
}

export function msToKmh(ms: number): number {
  return Math.round(ms * 3.6 * 10) / 10;
}

export function roundTempC(temp: number): number {
  return Math.round(temp * 10) / 10;
}

const DEG_TO_CARD = [
  "С",
  "ССВ",
  "СВ",
  "ВСВ",
  "В",
  "ВЮВ",
  "ЮВ",
  "ЮЮВ",
  "Ю",
  "ЮЮЗ",
  "ЮЗ",
  "ЗЮЗ",
  "З",
  "ЗСЗ",
  "СЗ",
  "ССЗ",
];

export function windCardinal(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return "";
  const i = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return DEG_TO_CARD[i] ?? "";
}

export function buildReportWeatherFields(input: {
  description?: string;
  tempC?: number | null;
  pressureHpa?: number | null;
  windMs?: number | null;
  windDeg?: number | null;
}) {
  return {
    weather_summary: (input.description || "").trim(),
    air_temperature_c: input.tempC != null ? roundTempC(input.tempC) : null,
    pressure_mmhg: input.pressureHpa != null ? hpaToMmHg(input.pressureHpa) : null,
    wind_direction: windCardinal(input.windDeg ?? null),
    wind_speed_ms: input.windMs != null ? Math.round(input.windMs * 10) / 10 : null,
  };
}
