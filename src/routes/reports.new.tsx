import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reports/new")({
  head: () => ({
    meta: [
      { title: "Новый отчёт — ZAPRUDA" },
      { name: "description", content: "Опишите рыбалку: водоём, погоду, приманки и улов." },
      { property: "og:title", content: "Новый отчёт — ZAPRUDA" },
      { property: "og:description", content: "Опишите рыбалку: водоём, погоду, приманки и улов." },
    ],
  }),
  component: NewReport,
});

type Catch = { species: string; weight: string; length: string };

function Label({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t}</span>
      {children}
    </label>
  );
}

function NewReport() {
  const navigate = useNavigate();
  const [catches, setCatches] = useState<Catch[]>([{ species: "", weight: "", length: "" }]);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [weather, setWeather] = useState("");
  const [temperature, setTemperature] = useState("");
  const [pressure, setPressure] = useState("");
  const [windDirection, setWindDirection] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [technique, setTechnique] = useState("");
  const [lures, setLures] = useState("");
  const [story, setStory] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const upd = (i: number, k: keyof Catch, v: string) =>
    setCatches((c) => c.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function publish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const cleanTitle = title.trim();
    if (!cleanTitle) { setError("Укажи название отчёта."); return; }
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error("Сначала войди в аккаунт, потом публикуй отчёт.");

      const { data: report, error: reportError } = await supabase
        .from("fishing_reports")
        .insert({
          user_id: user.id,
          title: cleanTitle,
          body: [story.trim(), technique.trim() ? "Техника: " + technique.trim() : "", lures.trim() ? "Приманки: " + lures.trim() : ""].filter(Boolean).join("\n\n") || null,
          location_name: location.trim() || null,
          weather_summary: weather.trim() || null,
          air_temperature_c: temperature.trim() ? Number(temperature) : null,
          pressure_hpa: pressure.trim() ? Number(pressure) * 1.33322 : null,
          wind_direction: windDirection.trim() || null,
          wind_speed_ms: windSpeed.trim() ? Number(windSpeed) : null,
          is_public: isPublic,
        })
        .select("id")
        .single();
      if (reportError) throw reportError;

      const validCatches = catches.filter((c) => c.species.trim()).map((c) => ({
        report_id: report.id,
        user_id: user.id,
        species: c.species.trim(),
        weight_kg: c.weight.trim() ? Number(c.weight) : null,
        length_cm: c.length.trim() ? Number(c.length) : null,
        technique: technique.trim() || null,
        lure: lures.trim() || null,
      }));
      if (validCatches.length) {
        const { error: catchesError } = await supabase.from("catches").insert(validCatches);
        if (catchesError) {
          setError("Отчёт создан, но улов сохранить не удалось: " + catchesError.message);
          setSaving(false);
          return;
        }
      }
      await navigate({ to: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось опубликовать отчёт.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <h1 className="mb-6 text-2xl font-bold">Новый отчёт</h1>
      <form className="space-y-6" onSubmit={publish}>
        <section className="panel grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label t="Название отчёта *"><input className="field" placeholder="Например, утро на Кудьме" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required /></Label>
          </div>
          <Label t="Водоём"><input className="field" placeholder="Например, Волга у Нижнего" value={location} onChange={(e) => setLocation(e.target.value)} /></Label>
          <Label t="Погода"><input className="field" placeholder="Пасмурно, небольшой дождь" value={weather} onChange={(e) => setWeather(e.target.value)} /></Label>
          <Label t="Температура, °C"><input className="field" type="number" step="0.1" placeholder="+12" value={temperature} onChange={(e) => setTemperature(e.target.value)} /></Label>
          <Label t="Давление, мм рт. ст."><input className="field" type="number" step="0.1" placeholder="752" value={pressure} onChange={(e) => setPressure(e.target.value)} /></Label>
          <Label t="Направление ветра"><input className="field" placeholder="СЗ" value={windDirection} onChange={(e) => setWindDirection(e.target.value)} /></Label>
          <Label t="Ветер, м/с"><input className="field" type="number" min="0" step="0.1" placeholder="4" value={windSpeed} onChange={(e) => setWindSpeed(e.target.value)} /></Label>
          <Label t="Техника ловли"><input className="field" placeholder="Джиг, ступенька" value={technique} onChange={(e) => setTechnique(e.target.value)} /></Label>
          <Label t="Приманки"><input className="field" placeholder="Виброхвост 3”, колебалка 10 г" value={lures} onChange={(e) => setLures(e.target.value)} /></Label>
          <div className="md:col-span-2">
            <Label t="Рассказ"><textarea className="field min-h-28" placeholder="Как прошла рыбалка? Где стоял, что пробовал, были ли поклёвки?" value={story} onChange={(e) => setStory(e.target.value)} /></Label>
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Опубликовать в общей ленте
          </label>
        </section>

        <section className="panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Улов</h2>
            <button type="button" className="btn-ghost" onClick={() => setCatches((c) => [...c, { species: "", weight: "", length: "" }])}>+ Рыба</button>
          </div>
          {catches.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <input className="field col-span-2 sm:col-span-1" placeholder="Вид (щука, окунь…)" value={c.species} onChange={(e) => upd(i, "species", e.target.value)} />
              <input className="field" type="number" min="0" step="0.01" placeholder="Вес, кг" value={c.weight} onChange={(e) => upd(i, "weight", e.target.value)} />
              <input className="field" type="number" min="0" step="0.1" placeholder="Длина, см" value={c.length} onChange={(e) => upd(i, "length", e.target.value)} />
              <button type="button" className="btn-ghost" aria-label="Удалить" onClick={() => setCatches((x) => x.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </section>

        {error && <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={saving}>{saving ? "Публикуем…" : "Опубликовать отчёт"}</button>
          <span className="text-xs text-muted-foreground">Фотографии подключим следующим этапом.</span>
        </div>
      </form>
    </Shell>
  );
}
