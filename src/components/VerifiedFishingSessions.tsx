import { useCallback, useEffect, useState } from "react";
import { Clock3, Play, Pause, Square, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FishingSessionTracker, type FishingClockState } from "@/components/FishingSessionTracker";

type Session = { id: string; started_at: string; running_since: string | null; active_seconds: number; status: "running" | "paused" | "finished" };
const seconds = (row: Session, at: number) => Math.min(86400, row.active_seconds + (row.running_since ? Math.max(0, Math.floor((at - new Date(row.running_since).getTime()) / 1000)) : 0));
const format = (count: number) => `${Math.floor(count / 3600)} ч ${Math.floor(count % 3600 / 60)} мин`;
const clock = (count: number) => [Math.floor(count / 3600), Math.floor(count % 3600 / 60), Math.floor(count % 60)].map(n => String(n).padStart(2, "0")).join(":");
export function VerifiedFishingSessions({ userId }: { userId: string }) {
  const [current, setCurrent] = useState<Session | null>(null);
  const [finished, setFinished] = useState<Session[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const load = useCallback(async () => {
    const { data, error: e } = await (supabase as any).from("fishing_sessions")
      .select("id,started_at,running_since,active_seconds,status")
      .order("started_at", { ascending: false }).limit(100);
    if (e) { setError(e.message); return; }
    const rows = (data ?? []) as Session[];
    setCurrent(rows.find(row => row.status !== "finished") ?? null);
    setFinished(rows.filter(row => row.status === "finished"));
    setError("");
  }, []);
  useEffect(() => {
    let active = true;
    void load().finally(() => { if (active) setLoading(false); });
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [load]);
  const command = async (action: "start" | "pause" | "resume" | "finish") => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const { error: e } = await (supabase as any).rpc("fishing_session_command", { p_action: action });
      if (e) throw e;
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось обновить сессию."); }
    finally { setBusy(false); }
  };
  const total = finished.reduce((sum, row) => sum + row.active_seconds, 0);
  const milestones = [{ name: "Первый выход", count: finished.length, target: 1, unit: "сессий" },
    { name: "10 часов на рыбалке", count: Math.floor(total / 3600), target: 10, unit: "часов" },
    { name: "100 часов на водоёмах", count: Math.floor(total / 3600), target: 100, unit: "часов" }];
  return <section className="mb-7 rounded-3xl border border-[#D7FF35]/30 bg-[#151915] p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#D7FF35]">ZAPRUDA / СЕРВЕРНЫЙ УЧЁТ</p>
        <h2 className="mt-2 flex items-center gap-2 text-xl font-bold"><Clock3 className="size-5 text-[#D7FF35]"/> Учёт времени рыбалки</h2></div>
      <button type="button" className="btn-ghost inline-flex" disabled={busy} onClick={() => void load()}><RefreshCw className="size-4"/> Обновить</button>
    </div>
    <p className="mt-2 text-sm text-zinc-400">Время фиксируется сервером, сохраняется в аккаунте и не зависит от хранения браузера. Для учёта нажми «Начать» при выходе на водоём и «Завершить» после рыбалки.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    {loading ? <p className="mt-4 text-sm text-zinc-400">Загружаем журнал…</p> : <>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-2xl font-black tabular-nums text-[#D7FF35]">{current ? clock(seconds(current, now)) : "00:00:00"}</p><p className="mt-1 text-xs text-zinc-400">Таймер (часы:минуты:секунды) · {current?.status === "running" ? "идёт" : current?.status === "paused" ? "пауза" : "нет сессии"}</p></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-2xl font-black tabular-nums">{format(total)}</p><p className="mt-1 text-xs text-zinc-400">Завершённые рыбалки</p></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!current && <button className="btn-primary inline-flex" type="button" disabled={busy} onClick={() => void command("start")}><Play className="size-4"/> Начать рыбалку</button>}
        {current?.status === "running" && <button className="btn-ghost inline-flex" type="button" disabled={busy} onClick={() => void command("pause")}><Pause className="size-4"/> Пауза</button>}
        {current?.status === "paused" && <button className="btn-primary inline-flex" type="button" disabled={busy} onClick={() => void command("resume")}><Play className="size-4"/> Продолжить</button>}
        {current && <button className="btn-ghost inline-flex" type="button" disabled={busy} onClick={() => void command("finish")}><Square className="size-4"/> Завершить</button>}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{milestones.map(m => {
        const percentage = Math.min(100, m.count / m.target * 100);
        return <div key={m.name} className="rounded-xl border border-white/10 bg-black/15 p-4">
          <h3 className="text-sm font-bold">{m.name}</h3><p className="mt-2 text-xs text-zinc-400">{m.count} / {m.target} {m.unit}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={m.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><div className="h-full rounded-full bg-[#D7FF35]" style={{width:percentage+"%"}}/></div>
          <p className="mt-2 text-xs text-zinc-500">{percentage >= 100 ? "Условие выполнено" : "До достижения"}</p>
        </div>;
      })}</div>
      <p className="mt-4 text-xs leading-5 text-zinc-500">Сервер подтверждает длительность работы таймера, но не физическое присутствие на водоёме. Пройденное расстояние и GPS-маршрут пока остаются локальными и не дают XP. Журнал показывает последние 100 сессий.</p>
      <FishingSessionTracker userId={userId} serverSession={current as FishingClockState | null}/>
    </>}
  </section>;
}
