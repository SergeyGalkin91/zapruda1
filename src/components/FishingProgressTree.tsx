import { Camera, Compass, Fish, Medal, ShieldCheck, Trophy, Users, Zap } from "lucide-react";
import type { Achievement, FishingProgress } from "@/lib/progression";
import { currentRank, FISHING_RANKS, getAchievements, totalExperience } from "@/lib/progression";

const categoryIcons = {
  "Первые шаги": Compass,
  "Улов": Fish,
  "Свой среди своих": Users,
  "Истории": Camera,
} as const;

export function FishingProgressTree({ progress }: { progress: FishingProgress }) {
  const xp = totalExperience(progress);
  const { rank, rankIndex, next, percent, pointsToNext } = currentRank(xp);
  const achievements = getAchievements(progress);
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const categories = ["Первые шаги", "Улов", "Свой среди своих", "Истории"] as const;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#D7FF35]/20 bg-gradient-to-br from-[#202C15] via-[#141B11] to-[#0F130F] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-[#D7FF35]/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-[24px] border border-[#D7FF35]/30 bg-[#D7FF35]/10 text-[#D7FF35]">
            <Trophy className="size-10" strokeWidth={1.4} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#D7FF35]">Твой ранг · уровень {rankIndex + 1}</p>
            <h2 className="mt-1 text-xl font-extrabold text-white sm:text-3xl">{rank.title}</h2>
            <p className="mt-1 text-xs text-[#9CA795]">{rank.motto}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center">
            <p className="text-2xl font-extrabold text-[#D7FF35]">{xp.toLocaleString("ru-RU")}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9CA795]">XP</p>
          </div>
        </div>
        <div className="relative mt-6">
          <div className="mb-2 flex justify-between gap-3 text-xs font-semibold">
            <span className="text-white">{rank.title}</span>
            <span className="text-[#D7FF35]">{next ? `До «${next.title}»: ${pointsToNext} XP` : "Максимальный уровень"}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/45">
            <div className="h-full rounded-full bg-[#D7FF35] transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <p className="relative mt-3 text-[11px] leading-5 text-[#85917D]">
          Уровни отражают активность внутри ZAPRUDA, а не официальную спортивную квалификацию.
          Вес трофеев указывается самими пользователями.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D7FF35]">Прокачка персонажа</p>
            <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Лестница рангов</h2>
          </div>
          <p className="text-xs font-semibold text-zinc-400">{rankIndex + 1} / {FISHING_RANKS.length} уровней</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {FISHING_RANKS.map((item, index) => {
            const reached = index <= rankIndex;
            return (
              <div key={item.title} className={`relative min-h-32 overflow-hidden rounded-2xl border p-4 transition ${index === rankIndex ? "border-[#D7FF35]/70 bg-[#D7FF35]/10 shadow-[0_0_26px_rgba(215,255,53,0.08)]" : reached ? "border-[#D7FF35]/25 bg-[#171F13]" : "border-white/[0.08] bg-[#151915] opacity-70"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-extrabold tracking-widest ${reached ? "text-[#D7FF35]" : "text-zinc-600"}`}>{item.symbol}</span>
                  {reached ? <ShieldCheck className="size-4 text-[#D7FF35]" /> : <Medal className="size-4 text-zinc-600" />}
                </div>
                <p className="mt-5 text-sm font-extrabold leading-5 text-white">{item.title}</p>
                <p className="mt-2 text-[11px] font-semibold text-[#9CA795]">{item.minXp.toLocaleString("ru-RU")} XP</p>
                {index === rankIndex && <span className="absolute right-3 top-10 rounded-md bg-[#D7FF35] px-1.5 py-0.5 text-[9px] font-black uppercase text-black">Текущий</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D7FF35]">Четыре ветки прогресса</p>
            <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Дерево достижений</h2>
          </div>
          <span className="rounded-xl border border-[#D7FF35]/30 bg-[#D7FF35]/10 px-3 py-2 text-xs font-bold text-[#D7FF35]">{unlocked} / {achievements.length}</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {categories.map((category) => {
            const Icon = categoryIcons[category];
            const nodes = achievements.filter((achievement) => achievement.category === category);
            return (
              <section key={category} className="rounded-2xl border border-white/10 bg-[#151914] p-4 sm:p-5">
                <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-[#D7FF35]/25 bg-[#D7FF35]/10 text-[#D7FF35]">
                    <Icon className="size-5" strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <h3 className="font-bold">{category}</h3>
                  <span className="ml-auto text-xs font-bold text-[#D7FF35]">{nodes.filter((node) => node.unlocked).length}/{nodes.length}</span>
                </div>
                <div className="ml-4 border-l border-[#D7FF35]/20 py-3">
                  {nodes.map((node: Achievement, index) => {
                    const progressPercent = Math.min(100, (node.current / node.target) * 100);
                    return (
                      <div key={node.id} className="relative mb-2 ml-5 rounded-xl border border-white/[0.07] bg-[#0F130F] p-3.5 last:mb-0">
                        <div className={`absolute -left-[34px] top-4 flex size-[26px] items-center justify-center rounded-lg border text-[10px] font-bold ${node.unlocked ? "border-[#D7FF35] bg-[#D7FF35] text-[#0D100C]" : "border-[#53604C] bg-[#161B15] text-[#818C7A]"}`}>
                          {node.unlocked ? <Zap className="size-3.5" fill="currentColor" /> : String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className={`text-sm font-bold ${node.unlocked ? "text-[#D7FF35]" : "text-white"}`}>{node.title}</h4>
                            <p className="mt-1 text-xs leading-5 text-zinc-400">{node.description}</p>
                          </div>
                          {node.unlocked && <Trophy className="size-4 shrink-0 text-[#D7FF35]" aria-label="Открыто" />}
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#323B2D]">
                            <div style={{ width: `${progressPercent}%` }} className="h-full rounded-full bg-[#D7FF35]" />
                          </div>
                          <span className="min-w-12 text-right text-[10px] font-bold text-zinc-400">{Math.min(node.current, node.target).toLocaleString("ru-RU")}/{node.target}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500">Опыт: отчёт +50 XP, улов +25 XP, фотоотчёт +15 XP, реакция другого рыболова +5 XP, организация выезда +40 XP.</p>
      </section>
    </div>
  );
}
