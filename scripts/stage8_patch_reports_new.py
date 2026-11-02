"""Stage 8: add OpenWeather autofill to reports/new without replacing the whole file."""
from pathlib import Path

p = Path("src/routes/reports.new.tsx")
t = p.read_text()

if "fillWeatherFromApi" in t and "openweather-current" in t:
    print("already patched")
    raise SystemExit(0)

if 'const [weather, setWeather] = useState("");' not in t:
    raise SystemExit("weather state not found")

if "weatherBusy" not in t:
    t = t.replace(
        'const [weather, setWeather] = useState("");',
        'const [weather, setWeather] = useState("");\n  const [weatherBusy, setWeatherBusy] = useState(false);\n  const [weatherHint, setWeatherHint] = useState("");',
        1,
    )

fn = '''
  async function fillWeatherFromApi() {
    if (weatherBusy) return;
    setWeatherBusy(true);
    setWeatherHint("");
    try {
      const city = location.trim() || "";
      if (!city) {
        setWeatherHint("Сначала укажи место (город/район) — по нему запросим погоду.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("openweather-current", { body: { city } });
      if (error || (data as { error?: string } | null)?.error) {
        setWeatherHint((data as { error?: string } | null)?.error || error?.message || "Погода недоступна");
        return;
      }
      const f = (data as { report_fields?: Record<string, unknown>; city?: string })?.report_fields ?? data;
      const rf = f as Record<string, unknown>;
      if (rf?.weather_summary) setWeather(String(rf.weather_summary));
      if (rf?.air_temperature_c != null) setTemperature(String(rf.air_temperature_c));
      if (rf?.pressure_mmhg != null) setPressure(String(rf.pressure_mmhg));
      if (rf?.wind_direction) setWindDirection(String(rf.wind_direction));
      if (rf?.wind_speed_ms != null) setWindSpeed(String(rf.wind_speed_ms));
      setWeatherHint(`OpenWeather · ${(data as { city?: string })?.city || city}`);
    } catch {
      setWeatherHint("Нет связи с сервисом погоды");
    } finally {
      setWeatherBusy(false);
    }
  }

'''

if "fillWeatherFromApi" not in t:
    idx = t.find("  return (\n    <Shell")
    if idx < 0:
        idx = t.find("  return (")
    if idx < 0:
        raise SystemExit("return not found")
    t = t[:idx] + fn + t[idx:]

old = '<Label t="Погода"><input className="field" placeholder="Пасмурно, небольшой дождь" value={weather} onChange={(e) => setWeather(e.target.value)} /></Label>'
new = '''<div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Погода</span>
              <button type="button" className="rounded-lg border border-[#D7FF35]/35 px-3 py-1.5 text-xs font-bold text-[#D7FF35] transition hover:bg-[#D7FF35]/10 disabled:opacity-50" disabled={weatherBusy} onClick={() => void fillWeatherFromApi()}>
                {weatherBusy ? "Загрузка…" : "Подставить из OpenWeather"}
              </button>
            </div>
            <input className="field" placeholder="Пасмурно, небольшой дождь" value={weather} onChange={(e) => setWeather(e.target.value)} />
            {weatherHint ? <p className="text-xs text-zinc-400">{weatherHint}</p> : null}
          </div>'''

if old not in t:
    if "Подставить из OpenWeather" in t:
        print("UI already present")
    else:
        raise SystemExit("weather label not found for UI patch")
else:
    t = t.replace(old, new, 1)

p.write_text(t)
print("patched", p)
