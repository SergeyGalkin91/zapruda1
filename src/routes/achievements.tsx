import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Award, Clock3, Footprints, LockKeyhole, Trophy } from "lucide-react";
import { Shell } from "@/components/Shell";
import { FishingProgressTree } from "@/components/FishingProgressTree";
import { ActivityAchievements } from "@/components/ActivityAchievements";
import { VerifiedFishingSessions } from "@/components/VerifiedFishingSessions";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_PROGRESS, type FishingProgress } from "@/lib/progression";

export const Route = createFileRoute("/achievements")({
  head: () => ({ meta: [
    { title: "Достижения и ранги — ZAPRUDA" },
    { name: "description", content: "Медали, ранги и прогресс рыболова в ZAPRUDA COMMUNITY." },
  ] }),
  component: AchievementsPage,
});

type LocalTrip = { activeMs?: number; distanceM?: number };
type LocalStore = { history?: LocalTrip[] };
function readLocalTrips(userId: string): { count: number; hours: number; km: number } {
  try {
    const raw = localStorage.getItem("zapruda.trip-tracker.v1." + userId);
    const parsed = raw ? JSON.parse(raw) as LocalStore : {};
    const history = Array.isArray(parsed.history) ? parsed.history : [];
    return {
      count: history.length,
      hours: Math.round(history.reduce((sum, trip) => sum + Math.max(0, Math.min(86400000, Number(trip.activeMs) || 0)), 0) / 360000) / 10,
      km: Math.round(history.reduce((sum, trip) => sum + Math.max(0, Number(trip.distanceM) || 0), 0) / 100) / 10,
    };
  } catch { return { count: 0, hours: 0, km: 0 }; }
}
function AchievementsPage() {
  const [progress, setProgress] = useState<FishingProgress>(EMPTY_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (!live) return;
        if (authError) throw authError;
        if (!data.user) { setLoading(false); return; }
        setUserId(data.user.id);
        const result = await supabase.rpc("my_fishing_progress");
        if (!live) return;
        if (result.error) throw result.error;
        const row = result.data?.[0];
        setProgress(row ? {
          report_count: Number(row.report_count),
          catches_count: Number(row.catches_count),
          photo_count: Number(row.photo_count),
          photo_reports: Number(row.photo_reports),
          reactions_received: Number(row.reactions_received),
          trips_organized: Number(row.trips_organized),
          heaviest_catch_kg: row.heaviest_catch_kg == null ? null : Number(row.heaviest_catch_kg),
        } : EMPTY_PROGRESS);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Не удалось загрузить достижения.");
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, []);
  const local = userId ? readLocalTrips(userId) : { count: 0, hours: 0, km: 0 };
  const tripChallenges = [
    { title: "Первый выход", target: 1, current: local.count, unit: "рыбалок", icon: Trophy },
    { title: "Рыболовный марафон", target: 10, current: local.hours, unit: "часов", icon: Clock3 },
    { title: "Пешком за хищником", target: 25, current: local.km, unit: "км", icon: Footprints },
  ];
  return <Shell>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D7FF35]">ZAPRUDA / ТРОФЕЙНАЯ КОМНАТА</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-white"><Award className="size-8 text-[#D7FF35]"/> Достижения</h1>
        <p className="mt-2 text-sm text-zinc-400">Ранги, медали и история твоего прогресса.</p>
      </div>
      <Link to="/profile" className="btn-ghost inline-flex"><ArrowLeft className="size-4"/> Профиль</Link>
    </div>
    {loading ? <div className="panel p-6 text-sm text-zinc-300" role="status">Загружаем достижения…</div>
    : !userId ? <section className="panel p-6"><p className="mb-4 text-zinc-300">Войди в аккаунт, чтобы открыть свои достижения.</p><Link to="/auth" className="btn-primary inline-flex">Войти</Link></section>
    : <>
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-400/30 p-3 text-sm text-red-300">{error}</p>}
      {!error && <FishingProgressTree progress={progress}/>}
      <section className="mb-7 mt-7 rounded-3xl border border-[#D7FF35]/20 bg-[#151915] p-5 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D7FF35]">Рыбалка в движении</p>
        <h2 className="mt-2 text-xl font-extrabold">Достижения за время и дистанцию</h2>
        <p className="mt-2 text-xs leading-5 text-zinc-400">Пока это предварительные показатели с текущего устройства. Они не подтверждены сервером, не дают XP и не считаются официально открытыми медалями.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {tripChallenges.map(item => {
            const Icon = item.icon;
            const pct = Math.min(100, Math.round(item.current / item.target * 100));
            return <div key={item.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <Icon className="size-7 text-[#D7FF35]" aria-hidden="true"/>
              <h3 className="mt-3 font-bold">{item.title}</h3>
              <p className="mt-1 text-xs text-zinc-400">{item.current} / {item.target} {item.unit}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#30372D]" role="progressbar" aria-label={item.title} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-[#D7FF35]" style={{width: pct + "%"}}/></div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-500"><LockKeyhole className="size-3.5"/> Ожидает подтверждения</span>
            </div>;
          })}
        </div>
        <Link to="/profile" className="btn-ghost mt-5 inline-flex">Открыть трекер рыбалки</Link>
      </section>
      <VerifiedFishingSessions userId={userId}/>
      <ActivityAchievements/>
    </>}
  </Shell>;
}
