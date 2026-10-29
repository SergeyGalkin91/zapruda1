import { useState } from "react";
import { Medal, Trophy, Waves, Zap } from "lucide-react";
import {
  FISHING_DISCIPLINES, methodAchievements, methodExperience, methodLevel, METHOD_RANKS,
} from "@/lib/disciplines";
import type { FishingSpecialization } from "@/lib/disciplines";

const EMPTY = {
  fishing_method:"", report_count:0, catches_count:0, credited_catches:0,
  photo_reports:0, distinct_waters:0, heaviest_catch_kg:null,
};

export function FishingDisciplineTree({
  stats, preferredMethod,
}: { stats: FishingSpecialization[]; preferredMethod?: string }) {
  const [selected,setSelected] = useState(preferredMethod || "Спиннинг");
  const discipline = FISHING_DISCIPLINES.find((x)=>x.code===selected) || FISHING_DISCIPLINES[0];
  const row = stats.find((x)=>x.fishing_method===discipline.code) ?? {...EMPTY,fishing_method:discipline.code};
  const xp = methodExperience(row);
  const stage = methodLevel(xp);
  const achievements = methodAchievements(row);
  const unlocked = achievements.filter((a)=>a.current>=a.target).length;

  return <section className="mt-9 space-y-5">
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#D7FF35]">Отдельная прокачка по способам ловли</p>
      <h2 className="mt-1 text-2xl font-black text-white">Мои рыболовные специализации</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
        Каждый способ ловли развивается независимо. Можно одновременно собирать награды за спиннинг,
        фидер, поплавок, нахлыст и подводную охоту. Опыт зачитывается по публикациям с выбранной дисциплиной.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {FISHING_DISCIPLINES.map((item)=>{
        const st=stats.find((x)=>x.fishing_method===item.code)??{...EMPTY,fishing_method:item.code};
        const count=methodAchievements(st).filter((a)=>a.current>=a.target).length;
        const score=methodExperience(st);
        const active=item.code===selected;
        return <button type="button" key={item.code} onClick={()=>setSelected(item.code)} aria-pressed={active}
          className={"relative min-h-[118px] rounded-2xl border p-4 text-left transition " +
            (active?"border-[#D7FF35]/75 bg-[#D7FF35]/10":"border-white/10 bg-[#141914] hover:border-[#D7FF35]/30")}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-2xl" aria-hidden="true">{item.icon}</span>
            <span className={"rounded-lg px-2 py-1 text-[10px] font-bold " + (active?"bg-[#D7FF35] text-black":"bg-white/5 text-zinc-400")}>{score} XP</span>
          </div>
          <h3 className={"mt-3 text-sm font-black "+(active?"text-[#D7FF35]":"text-white")}>{item.title}</h3>
          <p className="mt-1 text-[10px] text-zinc-500">{count}/8 достижений</p>
        </button>;
      })}
    </div>

    <div className="rounded-3xl border border-[#D7FF35]/20 bg-gradient-to-br from-[#1D2B17] via-[#131B12] to-[#0D120D] p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-[#D7FF35]/30 bg-[#D7FF35]/10 text-4xl">{discipline.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D7FF35]">Уровень {stage.index+1} / {METHOD_RANKS.length} · {discipline.title}</p>
          <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">{stage.current.name}</h3>
          <p className="mt-1 text-xs text-zinc-400">{discipline.detail}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-right">
          <p className="text-xl font-black text-[#D7FF35]">{xp.toLocaleString("ru-RU")} XP</p>
          <p className="mt-1 text-xs text-zinc-400">{row.report_count} отчётов · {row.catches_count} рыб</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-2 text-xs font-bold">
        <span className="text-zinc-300">{stage.current.name}</span>
        <span className="text-[#D7FF35]">{stage.next ? "До «"+stage.next.name+"»: "+(stage.next.minXp-xp)+" XP" : "Ветка пройдена"}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
        <div className="h-full rounded-full bg-[#D7FF35] transition-all" style={{width:stage.percent+"%"}} />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {METHOD_RANKS.map((level,index)=><div key={level.name} className={"rounded-xl border px-2 py-3 text-center " +
          (index<=stage.index?"border-[#D7FF35]/30 bg-[#D7FF35]/10":"border-white/[0.08] bg-black/15 opacity-50")}>
          <div className="flex justify-center">{index<=stage.index?<Zap className="size-4 text-[#D7FF35]"/>:<Medal className="size-4 text-zinc-500"/>}</div>
          <p className="mt-2 text-[10px] font-bold text-white">{level.name}</p>
          <p className="mt-1 text-[10px] text-zinc-500">{level.minXp} XP</p>
        </div>)}
      </div>
    </div>

    <div className="rounded-3xl border border-white/10 bg-[#151A14] p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D7FF35]">Коллекция / {discipline.title}</p>
          <h3 className="mt-2 text-xl font-bold">Ачивки дисциплины</h3></div>
        <span className="rounded-lg bg-[#D7FF35]/10 px-3 py-1 text-sm font-black text-[#D7FF35]">{unlocked} / {achievements.length}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {achievements.map((a,index)=>{
          const done=a.current>=a.target;
          return <article key={a.id} className={"flex gap-3 rounded-2xl border p-4 " +
            (done?"border-[#D7FF35]/30 bg-[#D7FF35]/5":"border-white/[0.08] bg-black/20")}>
            <div className={"flex size-12 shrink-0 items-center justify-center rounded-xl border " +
              (done?"border-[#D7FF35]/50 text-[#D7FF35]":"border-white/10 text-zinc-500")}>
              {done?<Trophy className="size-6"/>:<span className="font-black">{String(index+1).padStart(2,"0")}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white">{a.name}</h4>
              <p className="mt-1 text-xs leading-5 text-zinc-400">{a.description}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#D7FF35]" style={{width:Math.min(100,100*a.current/a.target)+"%"}} />
                </div>
                <span className="text-xs font-bold text-zinc-400">{Math.min(a.current,a.target)}/{a.target}</span>
              </div>
            </div>
          </article>;
        })}
      </div>
      {discipline.code==="Подводная охота" &&
        <p className="mt-4 rounded-xl border border-[#D7FF35]/15 bg-[#D7FF35]/5 p-3 text-xs leading-5 text-zinc-300">
          <Waves className="mr-1 inline size-4 text-[#D7FF35]"/> Достижения не поощряют опасные погружения,
          глубину или время задержки дыхания. Всегда учитывай местные ограничения и меры безопасности.
        </p>}
    </div>
  </section>;
}
