import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { DepthsWorkspace } from "@/components/DepthsWorkspace";
import { FishingTimerWorkspace } from "@/components/FishingTimerWorkspace";
import { FishingMapMarks } from "@/components/FishingMapMarks";
export const Route = createFileRoute("/fishing-map")({component:FishingMapPage,head:()=>({meta:[{title:"Карта и рыбалка — ZAPRUDA"}]})});
function FishingMapPage(){
 return <Shell>
  <p className="text-xs font-black uppercase tracking-[.18em] text-[#D7FF35]">ZAPRUDA / НА ВОДОЁМЕ</p>
  <h1 className="mt-2 text-3xl font-black text-white">Карта и рыбалка</h1>
  <p className="mt-2 text-sm text-zinc-400">Таймер, GPS-маршрут и карта глубин в одном месте. Карта глубин показывает только добавленные пользователями замеры.</p>
  <div className="mt-5 flex flex-wrap gap-2"><a className="btn-ghost" href="#fishing-timer">Таймер и GPS</a><a className="btn-ghost" href="#fishing-depths">Глубины и точки</a><Link to="/achievements" className="btn-ghost">Мои достижения</Link></div>
  <div id="fishing-timer" className="mt-6 scroll-mt-20"><FishingTimerWorkspace/></div>
  <div id="fishing-depths" className="mt-6 scroll-mt-20"><DepthsWorkspace/></div>
  <FishingMapMarks/>
 </Shell>;
}
