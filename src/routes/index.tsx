import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { ReactionBar } from "@/components/ReactionBar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZAPRUDA — лента рыболовных отчётов" },
      { name: "description", content: "Отчёты спиннингистов: водоёмы, приманки, погода и улов." },
      { property: "og:title", content: "ZAPRUDA — лента рыболовных отчётов" },
      { property: "og:description", content: "Отчёты спиннингистов: водоёмы, приманки, погода и улов." },
    ],
  }),
  component: Feed,
});

type Report = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  location_name: string | null;
  weather_summary: string | null;
  wind_direction: string | null;
  wind_speed_ms: number | null;
  air_temperature_c: number | null;
  pressure_hpa: number | null;
  user_id: string;
  profiles?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
};

function Feed() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("fishing_reports")
      .select("id,title,body,created_at,location_name,weather_summary,wind_direction,wind_speed_ms,air_temperature_c,pressure_hpa,user_id,profiles(username,display_name,avatar_url)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (queryError) {
      setError("Не удалось загрузить отчёты: " + queryError.message);
    } else {
      setReports((data ?? []) as unknown as Report[]);
      setError("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadReports();
    const channel = supabase
      .channel("public-fishing-reports-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "fishing_reports" }, () => void loadReports())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadReports]);

  return (
    <Shell>
      <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">🎣 Спиннинг · отчёты</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Лента рыбалок 🐟</h1>
          <p className="mt-2 max-w-md text-muted-foreground">Реальные выезды: где, на что и при какой погоде клевало. Делись победами и фейлами 😂</p>
        </div>
        <Link to="/reports/new" className="btn-primary self-start">🎣 Новый отчёт</Link>
      </section>

      {loading && <div className="panel p-5 text-sm text-muted-foreground">Загружаем отчёты…</div>}
      {error && <div className="mb-4 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">{error}</div>}
      {!loading && !error && reports.length === 0 && (
        <div className="panel p-8 text-center">
          <div className="text-3xl">🎣</div>
          <h2 className="mt-3 font-semibold">Пока тихо, как на бесклёвье</h2>
          <p className="mt-1 text-sm text-muted-foreground">Будь первым — опубликуй отчёт о рыбалке.</p>
          <Link to="/reports/new" className="btn-primary mt-4 inline-flex">Создать отчёт</Link>
        </div>
      )}
      {reports.map((report) => {
        const name = report.profiles?.display_name || report.profiles?.username || "Рыболов";
        return (
          <article key={report.id} className="panel mb-5 space-y-4 p-5">
            <div className="flex items-start gap-3">
              {report.profiles?.avatar_url
                ? <img src={report.profiles.avatar_url} alt="" className="size-11 rounded-full object-cover" />
                : <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-xl">🎣</div>}
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{name}</div>
                <div className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString("ru-RU")}</div>
              </div>
              <span className="rounded-full bg-secondary px-2 py-1 text-xs">🐟 Отчёт</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">{report.title}</h2>
              {report.body && <p className="mt-2 whitespace-pre-wrap text-sm">{report.body}</p>}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {report.location_name && <span className="rounded-full bg-secondary px-3 py-1.5">📍 {report.location_name}</span>}
              {report.weather_summary && <span className="rounded-full bg-secondary px-3 py-1.5">🌦️ {report.weather_summary}</span>}
              {report.air_temperature_c != null && <span className="rounded-full bg-secondary px-3 py-1.5">🌡️ {report.air_temperature_c}°C</span>}
              {report.wind_direction && <span className="rounded-full bg-secondary px-3 py-1.5">💨 {report.wind_direction}{report.wind_speed_ms != null ? `, ${report.wind_speed_ms} м/с` : ""}</span>}
              {report.pressure_hpa != null && <span className="rounded-full bg-secondary px-3 py-1.5">🧭 ${Math.round(report.pressure_hpa / 1.33322)} мм рт. ст.</span>}
            </div>
            <ReactionBar reportId={report.id} />
          </article>
        );
      })}
    </Shell>
  );
}
