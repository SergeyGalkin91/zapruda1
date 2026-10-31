import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Award, Camera, Compass, Fish, Medal, Trophy, Zap } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import {
  EMPTY_METHOD, FISHING_DISCIPLINES, methodAchievements,
  methodExperience, methodExperienceBreakdown, methodLevel, METHOD_RANKS,
} from "@/lib/disciplines";
import type { FishingSpecialization, MethodAchievement } from "@/lib/disciplines";

export const Route = createFileRoute("/specializations")({
  head: () => ({meta: [
    {title: "Специализации и ачивки — ZAPRUDA"},
    {name: "description", content: "Уровни, XP, достижения, задачи и прогресс рыболовных специализаций."},
  ]}),
  validateSearch: (query: Record<string, unknown>) => ({
    method: typeof query["method"] === "string" ? query["method"] : "Спиннинг",
  }),
  component: SpecializationPage,
});

function AchievementCard({ achievement }: { achievement: MethodAchievement }) {
  const earned = achievement.current >= achievement.target;
  const percent = Math.min(100, Math.round(achievement.current / achievement.target * 100));
  return <details className={"group rounded-2xl border p-4 " + (earned ?
    "border-[#D7FF35]/35 bg-[#D7FF35]/[0.06]" : "border-white/10 bg-[#151A14]")}>
    <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
      <span className={"flex size-12 shrink-0 items-center justify-center rounded-xl border " +
        (earned ? "border-[#D7FF35]/50 text-[#D7FF35]" : "border-white/15 text-zinc-500")}>
        {earned ? <Trophy className="size-5"/> : <Medal className="size-5"/>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-[#D7FF35]">{achievement.category}</span>
        <strong className="mt-1 block text-sm text-white">{achievement.name}</strong>
        <span className="mt-1 block text-xs text-zinc-400">{achievement.description}</span>
      </span>
      <span className="shrink-0 text-right text-xs">
        <span className={"block font-bold " + (earned ? "text-[#D7FF35]" : "text-zinc-300")}>
          {earned ? "Получена" : Math.min(achievement.current,achievement.target)+"/"+achievement.target}
        </span>
        <span className="mt-1 block text-zinc-500 group-open:hidden">Условия ↓</span>
        <span className="mt-1 hidden text-zinc-500 group-open:block">Свернуть ↑</span>
      </span>
    </summary>
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-[#D7FF35]" style={{width:percent+"%"}}/>
    </div>
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="text-xs font-bold text-[#D7FF35]">{earned ? "Награда уже получена" : "Как открыть ачивку"}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{achievement.instructions}</p>
      {!earned && <p className="mt-2 text-xs text-zinc-400">Осталось: {Math.max(0,achievement.target-achievement.current)}. Прогресс обновится после зачётного отчёта.</p>}
    </div>
  </details>;
}

function SpecializationPage() {
  const {method} = Route.useSearch();
  const [stats,setStats] = useState<FishingSpecialization[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [userPresent,setUserPresent] = useState(false);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!alive) return;
      if (authError || !user) {
        setUserPresent(false); setLoading(false);
        setError("Для просмотра своих достижений нужно войти в ZAPRUDA.");
        return;
      }
      setUserPresent(true);
      const { data,error: queryError } = await supabase.rpc("my_fishing_specializations_v2");
      if (!alive) return;
      if (queryError) setError("Не удалось рассчитать специализации: "+queryError.message);
      else {
        setError("");
        setStats((data??[]).map(row => ({
          fishing_method: row.fishing_method,
          report_count: Number(row.report_count),
          credited_reports: Number(row.credited_reports),
          catches_count: Number(row.catches_count),
          credited_catches: Number(row.credited_catches),
          photo_reports: Number(row.photo_reports),
          credited_photo_reports: Number(row.credited_photo_reports),
          distinct_waters: Number(row.distinct_waters),
          active_days: Number(row.active_days),
          distinct_species: Number(row.distinct_species),
          heaviest_catch_kg: row.heaviest_catch_kg === null ? null : Number(row.heaviest_catch_kg),
        })));
      }
      setLoading(false);
    })().catch(cause => {
      if (!alive) return;
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить данные.");
      setLoading(false);
    });
    return () => { alive=false; };
  },[]);
  const discipline = FISHING_DISCIPLINES.find(d=>d.code===method)??FISHING_DISCIPLINES[0];
  const own = stats.find(st=>st.fishing_method===discipline.code)??{...EMPTY_METHOD,fishing_method:discipline.code};
  const xp = methodExperience(own);
  const level = methodLevel(xp);
  const achievements = methodAchievements(own,discipline.code);
  const completed = achievements.filter(a=>a.current>=a.target).length;
  return <Shell>
    <Link to="/profile" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-[#D7FF35]">
      <ArrowLeft className="size-4"/> Назад в профиль
    </Link>
    <section className="rounded-3xl border border-[#D7FF35]/20 bg-gradient-to-br from-[#1B2916] via-[#141D13] to-[#101410] p-5 sm:p-7">
      <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#D7FF35]">ZAPRUDA / СПЕЦИАЛИЗАЦИИ</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-2xl border border-[#D7FF35]/35 bg-[#D7FF35]/10 text-4xl">{discipline.icon}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-white sm:text-3xl">{discipline.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{discipline.detail}</p>
          <p className="mt-2 text-xs font-semibold text-[#D7FF35]">Уровень {level.index+1}/{METHOD_RANKS.length} · {level.current.name}</p>
        </div>
        <div className="rounded-xl border border-[#D7FF35]/20 bg-[#D7FF35]/10 px-5 py-3">
          <strong className="text-2xl font-black text-[#D7FF35]">{xp.toLocaleString("ru-RU")} XP</strong>
          <p className="mt-1 text-xs text-zinc-400">{completed}/{achievements.length} ачивок</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-2 text-xs">
        <span className="text-zinc-300">{level.current.name}</span>
        <span className="font-bold text-[#D7FF35]">{level.next ? "До "+level.next.name+": "+(level.next.minXp-xp)+" XP" : "Высший ранг"}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-[#D7FF35]" style={{width:level.percent+"%"}}/></div>
      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {METHOD_RANKS.map((rank,i)=><div key={rank.name} className={"rounded-xl border p-2 text-center " + (i<=level.index?"border-[#D7FF35]/30 bg-[#D7FF35]/10":"border-white/10 bg-black/10 opacity-55")}>
          <div className="flex justify-center">{i<=level.index?<Award className="size-4 text-[#D7FF35]"/>:<Medal className="size-4 text-zinc-500"/>}</div>
          <p className="mt-2 text-[10px] font-semibold text-zinc-200">{rank.name}</p>
          <p className="mt-1 text-[10px] text-zinc-500">{rank.minXp} XP</p>
        </div>)}
      </div>
    </section>
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-950/25 p-4 text-sm text-red-200">{error} {!userPresent && <Link search={{ mode: "in" }} className="text-[#D7FF35] underline" to="/auth">Войти</Link>}</p>}
    {loading && <p className="mt-5 text-sm text-zinc-400">Загружаем прогресс…</p>}
    {!loading && userPresent && !error && <>
      <section className="mt-6 rounded-3xl border border-white/10 bg-[#151A14] p-5 sm:p-7">
        <h2 className="flex items-center gap-2 text-xl font-black text-white"><Zap className="size-6 text-[#D7FF35]"/> За что начисляются XP</h2>
        <p className="mt-2 text-xs leading-5 text-zinc-400">
          Опыт зачитывается по данным твоих опубликованных отчётов, а не по времени с открытой вкладкой.
          В каждой дисциплине максимум два зачётных отчёта в день (UTC).
          Для бонуса за улов, а также за новый водоём нужен зачётный фотоотчёт.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {methodExperienceBreakdown(own).map(part => <div key={part.label} className="rounded-xl border border-white/10 bg-black/15 p-4">
            <div className="flex justify-between gap-3"><strong className="text-sm text-white">{part.label}</strong><strong className="whitespace-nowrap text-sm text-[#D7FF35]">+{part.value*part.per} XP</strong></div>
            <p className="mt-1 text-xs text-zinc-300">{part.value} × {part.per} XP</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">{part.detail}</p>
          </div>)}
        </div>
      </section>
      <section className="mt-6" aria-labelledby="specialization-achievements">
        <h2 id="specialization-achievements" className="flex items-center gap-2 text-xl font-black"><Trophy className="size-6 text-[#D7FF35]"/> Ачивки · {completed}/{achievements.length}</h2>
        <p className="mt-2 text-sm text-zinc-400">Нажми на любую ачивку — увидишь, что она даёт, как её получить и сколько осталось.</p>
        <div className="mt-4 grid items-start gap-3 md:grid-cols-2">
          {achievements.map(a=><AchievementCard key={a.id} achievement={a}/>)}
        </div>
      </section>
      <div className="mt-6 rounded-2xl border border-[#D7FF35]/25 bg-[#D7FF35]/5 p-5">
        <p className="text-sm font-bold text-white">Как прокачать {discipline.title.toLowerCase()}?</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">Выбери эту дисциплину в следующем рыболовном отчёте. Добавь фото, если хочешь получить бонус за фотоотчёт и записи об уловах. Точные координаты не требуются.</p>
        <Link to="/reports/new" className="btn-primary mt-4 inline-flex">Создать рыболовный отчёт →</Link>
      </div>
      <p className="mt-4 text-xs leading-5 text-zinc-500">Достижения за специализацию показывают активность, а не подтверждённые рекорды. Вес, подлинность фото, вид рыбы и название водоёма здесь автоматически не верифицируются. Проверенные трофеи будут учитываться отдельно в Атласе.</p>
    </>}
    <div className="mt-8 border-t border-white/10 pt-5">
      <h2 className="text-sm font-semibold text-zinc-300">Другие специализации</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {FISHING_DISCIPLINES.map(item=><Link to="/specializations" search={{method:item.code}} key={item.code}
          className={"rounded-xl border px-3 py-2 text-xs font-bold transition " + (item.code===discipline.code?"border-[#D7FF35] bg-[#D7FF35] text-[#0D100C]":"border-white/10 text-zinc-300 hover:border-[#D7FF35]/40")}>{item.icon} {item.title}</Link>)}
      </div>
    </div>
  </Shell>;
}
