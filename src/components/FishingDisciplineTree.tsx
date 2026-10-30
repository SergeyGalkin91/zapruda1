import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Medal, Trophy, Zap } from "lucide-react";
import { FISHING_DISCIPLINES, EMPTY_METHOD, methodAchievements, methodExperience, methodLevel, METHOD_RANKS } from "@/lib/disciplines";
import type { FishingSpecialization } from "@/lib/disciplines";

export function FishingDisciplineTree({ stats, preferredMethod }: { stats: FishingSpecialization[]; preferredMethod?: string }) {
  const featured = FISHING_DISCIPLINES.find(x => x.code === preferredMethod) || FISHING_DISCIPLINES[0];
  const ranked = [...FISHING_DISCIPLINES].sort((a,b) => {
    const xpA = methodExperience(stats.find(s => s.fishing_method === a.code) ?? EMPTY_METHOD);
    const xpB = methodExperience(stats.find(s => s.fishing_method === b.code) ?? EMPTY_METHOD);
    return xpB-xpA || Number(b.code === featured.code)-Number(a.code === featured.code);
  });
  return <section className="mt-9 space-y-5" aria-labelledby="specialization-heading">
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#D7FF35]">Отдельная прокачка по направлениям</p>
      <h2 id="specialization-heading" className="mt-1 text-2xl font-black text-white">Мои рыболовные специализации</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">У каждой техники собственные ранги, XP и 12 достижений. Нажми на специализацию, чтобы открыть подробности, список ачивок и правила начисления.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ranked.map(item => {
        const st = stats.find(s => s.fishing_method === item.code) ?? {...EMPTY_METHOD, fishing_method:item.code};
        const xp = methodExperience(st), level = methodLevel(xp);
        const all = methodAchievements(st,item.code);
        const unlocked = all.filter(a => a.current>=a.target).length;
        return <Link to="/specializations" search={{method:item.code}} key={item.code}
          aria-label={"Открыть специализацию " + item.title}
          className={"group flex min-h-[180px] flex-col rounded-2xl border p-4 transition hover:border-[#D7FF35]/65 hover:bg-[#D7FF35]/[0.06] " +
          (item.code===featured.code ? "border-[#D7FF35]/40 bg-[#D7FF35]/[0.04]" : "border-white/10 bg-[#141914]")}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-3xl" aria-hidden="true">{item.icon}</span>
            <span className="rounded-lg bg-[#D7FF35]/10 px-2.5 py-1 text-xs font-black text-[#D7FF35]">{xp.toLocaleString("ru-RU")} XP</span>
          </div>
          <h3 className="mt-3 text-base font-black text-white group-hover:text-[#D7FF35]">{item.title}</h3>
          <p className="mt-1 text-xs text-zinc-400">{level.current.name} · уровень {level.index+1}/{METHOD_RANKS.length}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#D7FF35]" style={{width:level.percent+"%"}} /></div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-4">
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400"><Trophy className="size-3.5"/> {unlocked}/{all.length} ачивок</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#D7FF35]">Открыть <ArrowUpRight className="size-3.5"/></span>
          </div>
        </Link>;
      })}
    </div>
    <div className="rounded-2xl border border-[#D7FF35]/20 bg-[#1B2518] px-4 py-4 sm:px-5">
      <p className="flex items-center gap-2 text-sm font-bold"><Medal className="size-5 text-[#D7FF35]"/> Как начисляется опыт?</p>
      <p className="mt-2 text-xs leading-6 text-zinc-300"><Zap className="mr-1 inline size-4 text-[#D7FF35]"/> +30 XP за отчёт (до двух в сутки), +15 за фотоотчёт, +10 за запись об улове (до трёх на зачётный фотоотчёт), +10 за новый названный водоём, +5 за активный день. Фото не является подтверждением трофея. Открой направление для полного расчёта.</p>
    </div>
  </section>;
}
