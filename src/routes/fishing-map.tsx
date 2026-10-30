import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { FishingMapMarks } from "@/components/FishingMapMarks";
export const Route=createFileRoute("/fishing-map")({component:MapPage,head:()=>({meta:[{title:"Карта — ZAPRUDA"}]})});
function MapPage(){return <Shell><div className="mx-auto max-w-5xl"><p className="text-xs font-black uppercase tracking-[.2em] text-[#D7FF35]">ZAPRUDA / МЕСТА</p><h1 className="mt-2 text-3xl font-black">Карта</h1><p className="mt-2 text-sm text-zinc-400">Места рыбалки, уловы и заметки участников. Добавь точку, расскажи, какая рыба здесь ловилась, и прикрепи фотографию. Без таймеров и погодных показателей.</p><FishingMapMarks/></div></Shell>}