import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect,useState } from "react";
import { Award, Fish, Camera, Trophy, Star } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
export const Route=createFileRoute("/achievements")({component:Achievements,head:()=>({meta:[{title:"Достижения — ZAPRUDA"}]})});
type Progress={report_count:number;photo_reports:number;heaviest_catch_kg:number|null;reactions_received:number};
const badges=[
 {name:"Первый улов",description:"Опубликуй первый отчёт",goal:1,field:"report_count" as const,Icon:Fish,tier:"Начальное"},
 {name:"Рыболов со стажем",description:"Опубликуй 10 отчётов",goal:10,field:"report_count" as const,Icon:Award,tier:"Среднее"},
 {name:"Фотоохотник",description:"Добавь фото в 10 отчётов",goal:10,field:"photo_reports" as const,Icon:Camera,tier:"Среднее"},
 {name:"Любимец сообщества",description:"Получи 100 реакций",goal:100,field:"reactions_received" as const,Icon:Star,tier:"Топовое"}
];
function Achievements(){
 const [progress,setProgress]=useState<Progress|null>(null),[loading,setLoading]=useState(true),[signedIn,setSignedIn]=useState(false),[error,setError]=useState("");
 useEffect(()=>{let live=true;void (async()=>{try{const {data}=await supabase.auth.getUser();if(!live)return;setSignedIn(Boolean(data.user));if(data.user){const {data:rows,error:e}=await supabase.rpc("my_fishing_progress");if(e)throw e;const p=rows?.[0];if(live)setProgress({report_count:Number(p?.report_count??0),photo_reports:Number(p?.photo_reports??0),heaviest_catch_kg:p?.heaviest_catch_kg==null?null:Number(p.heaviest_catch_kg),reactions_received:Number(p?.reactions_received??0)});}}catch(e){if(live)setError(e instanceof Error?e.message:"Не удалось загрузить достижения");}finally{if(live)setLoading(false)}})();return()=>{live=false}},[]);
 return <Shell><div className="mx-auto max-w-5xl">
 <p className="text-xs font-black uppercase tracking-[.18em] text-[#D7FF35]">ZAPRUDA / ПРОГРЕСС</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><Trophy className="size-8 text-[#D7FF35]"/>Достижения</h1>
 <p className="mt-2 text-sm text-zinc-400">Несколько главных наград за настоящую активность: отчёты, фотографии и реакции сообщества. Без GPS-таймеров и лишних уровней.</p>
 {loading?<p className="panel mt-6 p-5" role="status">Загружаем…</p>:!signedIn?<div className="panel mt-6 p-5"><p>Для просмотра достижений войди в аккаунт.</p><Link className="btn-primary mt-3 inline-flex" to="/auth">Войти</Link></div>:<>
 {error&&<p role="alert" className="mt-4 text-red-300">{error}</p>}
 <div className="mt-6 grid gap-3 sm:grid-cols-2">{badges.map(b=>{const current=progress?.[b.field]??0;const value=Math.min(current,b.goal);const unlocked=current>=b.goal;return <section className="rounded-2xl border border-white/10 bg-[#151915] p-5" key={b.name}>
 <div className="flex items-start justify-between gap-3"><b.Icon className={"size-7 "+(unlocked?"text-[#D7FF35]":"text-zinc-500")}/><span className="text-xs text-zinc-500">{b.tier}</span></div>
 <h2 className="mt-3 text-lg font-bold">{b.name}</h2><p className="mt-1 text-sm text-zinc-400">{b.description}</p>
 <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#D7FF35]" style={{width:(100*value/b.goal)+"%"}}/></div>
 <p className="mt-2 text-xs text-zinc-400">{value} / {b.goal} · {unlocked?"Получено":"В процессе"}</p></section>})}</div>
 {progress?.heaviest_catch_kg!=null&&<p className="mt-5 text-sm text-zinc-400">Твой самый крупный зарегистрированный улов: <strong className="text-white">{progress.heaviest_catch_kg} кг</strong></p>}
 </>}
 </div></Shell>;
}