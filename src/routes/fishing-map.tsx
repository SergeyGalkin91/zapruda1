import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Compass, MapPinned } from "lucide-react";
import { Shell } from "@/components/Shell";
import { FishingMapMarks } from "@/components/FishingMapMarks";

export const Route = createFileRoute("/fishing-map")({
  component: MapPage,
  head: () => ({ meta: [{ title: "Карта рыболовных мест — ZAPRUDA" }] }),
});

function MapPage() {
  return (
    <Shell>
      <main className="mx-auto max-w-5xl space-y-5">
        <header className="relative overflow-hidden rounded-[24px] border border-[#D7FF35]/20 bg-[#101710] p-5 sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60" style={{background:"radial-gradient(ellipse at 92% 15%,rgba(215,255,53,.15),transparent 43%),repeating-radial-gradient(circle at 93% 60%,transparent 0,transparent 33px,rgba(215,255,53,.07) 34px,transparent 35px)"}} />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-[#D7FF35]"><Compass className="size-4"/> ZAPRUDA / EXPLORE</p>
              <h1 className="mt-3 text-4xl font-black uppercase tracking-[-.06em] text-white sm:text-5xl">Свои <span className="text-[#D7FF35]">места.</span></h1>
              <span className="zapruda-hand-note mt-1 inline-block text-[#FF8128]">Исследуй воду ↗</span>
              <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-300">Рыболовные точки, наблюдения и фотографии участников. Выбирай место прямо на карте и решай, кому показывать свою отметку.</p>
            </div>
            <Link to="/reports/new" className="relative inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7FF35]/40 bg-[#D7FF35]/10 px-4 py-3 text-xs font-black text-[#D7FF35] hover:bg-[#D7FF35]/20"><MapPinned className="size-4"/> Новый отчёт <ArrowUpRight className="size-4"/></Link>
          </div>
        </header>
        <FishingMapMarks/>
      </main>
    </Shell>
  );
}
