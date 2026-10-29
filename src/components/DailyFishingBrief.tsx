import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CloudSun, Compass, ExternalLink, Newspaper, ShieldCheck, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Article = { title: string; source: string; url: string; published_at: string };
type Weather = { city: string; region: string; temperature_c: number | null; pressure_hpa: number | null; wind_kmh: number | null; observed_at: string; source: string };
type Brief = { date: string; news: Article[]; weather: Weather | null; city_configured: boolean; history: null; history_note?: string };
const pressureMm = (hpa: number) => Math.round(hpa * 0.750061683);

export function DailyFishingBrief() {
  const [authorized, setAuthorized] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    let authSubscription: { unsubscribe: () => void } | undefined;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      const loggedIn = Boolean(data.user && !data.user.is_anonymous);
      setAuthorized(loggedIn);
      if (!loggedIn) { setBrief(null); return; }
      setLoading(true);
      setError("");
      try {
        const { data: payload, error: fetchError } = await supabase.functions.invoke("daily-fishing-brief", { body: {} });
        if (!alive) return;
        if (fetchError || !payload || !Array.isArray(payload.news)) {
          setError("Не удалось обновить сводку. Попробуй позже.");
        } else {
          setBrief(payload as Brief);
        }
      } catch {
        if (alive) setError("Нет связи с сервисом сводки.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    const { data } = supabase.auth.onAuthStateChange(() => { void load(); });
    authSubscription = data.subscription;
    return () => { alive = false; authSubscription?.unsubscribe(); };
  }, []);

  if (!authorized) return null;
  return (
    <section aria-labelledby="daily-fishing-brief" className="mb-7 overflow-hidden rounded-3xl border border-[#D7FF35]/25 bg-gradient-to-br from-[#1D2717] via-[#131A12] to-[#0D100C] p-5 shadow-xl shadow-black/10 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#D7FF35]/70 bg-[#D7FF35]/10 text-[#D7FF35]">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-white">Администрация ZAPRUDA</p>
            <span className="rounded-full border border-[#D7FF35]/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#D7FF35]">Официально</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">Мировая рыболовная повестка · {new Date().toLocaleDateString("ru-RU")}</p>
        </div>
      </div>
      <h2 id="daily-fishing-brief" className="mt-5 flex items-center gap-2 text-xl font-black text-white sm:text-2xl">
        <Newspaper className="size-6 text-[#D7FF35]" aria-hidden="true" /> Рыболовная сводка дня
      </h2>
      <p className="mt-2 text-sm text-zinc-300">Реальные публикации международных источников и условия для рыбалки в твоём регионе.</p>
      {loading && <p role="status" className="mt-5 text-sm text-zinc-400">Загружаем сводку…</p>}
      {error && <p role="status" className="mt-5 text-sm text-amber-200">{error}</p>}
      {brief && <>
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <h3 className="flex items-center gap-2 text-sm font-black text-white"><CloudSun className="size-5 text-[#D7FF35]"/> Погода в твоём регионе</h3>
          {brief.weather ? <>
            <p className="mt-2 text-sm text-zinc-300">{brief.weather.city}{brief.weather.region ? `, ${brief.weather.region}` : ""}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {typeof brief.weather.temperature_c === "number" && <span className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white">{Math.round(brief.weather.temperature_c)} °C</span>}
              {typeof brief.weather.pressure_hpa === "number" && <span className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white"><Compass className="mr-1 inline size-4"/> {pressureMm(brief.weather.pressure_hpa)} мм рт. ст.</span>}
              {typeof brief.weather.wind_kmh === "number" && <span className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white"><Wind className="mr-1 inline size-4"/> {(brief.weather.wind_kmh / 3.6).toFixed(1)} м/с</span>}
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">Источник: Open-Meteo · {brief.weather.observed_at.replace("T", " ")} (местное время). Давление приведено к уровню моря.</p>
          </> : <p className="mt-2 text-sm text-zinc-400">{brief.city_configured ? "Погода временно недоступна." : <>Укажи город в <Link to="/profile" className="font-bold text-[#D7FF35] underline">профиле</Link>, чтобы видеть погоду и давление.</>}</p>}
        </div>
        <div className="mt-5 space-y-3">
          {brief.news.length ? brief.news.map((article, i) => (
            <article key={article.url + i} className="rounded-xl border border-white/10 bg-black/15 p-4">
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2 text-sm font-bold leading-6 text-white hover:text-[#D7FF35]">
                <span className="flex-1">{article.title}</span><ExternalLink className="mt-1 size-4 shrink-0 text-[#D7FF35]" aria-hidden="true"/>
              </a>
              <p className="mt-2 text-xs text-zinc-400">{article.source} · {new Date(article.published_at).toLocaleDateString("ru-RU")}</p>
            </article>
          )) : <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-400">Подтверждённых свежих новостей пока нет. Не будем заполнять ленту выдуманными событиями.</p>}
        </div>
        <div className="mt-4 rounded-xl border border-[#D7FF35]/10 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-[#D7FF35]">В этот день в истории рыбалки</p>
          <p className="mt-2 text-sm text-zinc-400">Проверяем исторические рекорды и события по первоисточникам. Факт появится здесь, только если подтверждены точная дата и источник.</p>
        </div>
      </>}
    </section>
  );
}
