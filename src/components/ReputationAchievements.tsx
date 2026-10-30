import { useEffect, useState } from "react";
import { Award, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function ReputationAchievements({ userId }: { userId: string }) {
 const [stats,setStats]=useState({partner:0,guide:0,given:0});
 const [error,setError]=useState("");
 useEffect(()=>{
  let live=true;
  void (async()=>{
   const [partner,guide,givenPartner,givenGuide]=await Promise.all([
    (supabase as any).from("trip_reviews").select("id",{count:"exact",head:true}).eq("reviewed_id",userId),
    (supabase as any).from("angler_reviews").select("id",{count:"exact",head:true}).eq("target_id",userId).eq("context","guide"),
    (supabase as any).from("trip_reviews").select("id",{count:"exact",head:true}).eq("reviewer_id",userId),
    (supabase as any).from("angler_reviews").select("id",{count:"exact",head:true}).eq("author_id",userId).eq("context","guide")
   ]);
   if(!live)return;
   if(partner.error||guide.error||givenPartner.error||givenGuide.error){setError("Не удалось загрузить статистику отзывов.");return;}
   setStats({partner:partner.count||0,guide:guide.count||0,given:(givenPartner.count||0)+(givenGuide.count||0)});
  })();
  return()=>{live=false};
 },[userId]);
 const trophies=[
  {name:"Свой человек",description:"Получи первый отзыв от напарника",n:stats.partner,target:1},
  {name:"Надёжный напарник",description:"Получи 5 отзывов от напарников",n:stats.partner,target:5},
  {name:"Проверенный гид",description:"Получи 3 отзыва от клиентов",n:stats.guide,target:3},
  {name:"Голос сообщества",description:"Напиши 5 отзывов по совместным выездам",n:stats.given,target:5},
 ];
 return <section className="mb-7 rounded-3xl border border-[#D7FF35]/20 bg-[#151915] p-5 sm:p-7">
  <p className="text-xs font-extrabold uppercase tracking-widest text-[#D7FF35]">ZAPRUDA / РЕПУТАЦИЯ</p>
  <h2 className="mt-2 flex items-center gap-2 text-xl font-bold"><Award className="size-5 text-[#D7FF35]"/> Ачивки доверия</h2>
  <p className="mt-2 text-xs leading-5 text-zinc-400">Награды за количество отзывов. Это информационный прогресс, пока без начисления XP. Оценка доверия также зависит от звёзд и числа различных авторов.</p>
  {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  <div className="mt-5 grid gap-3 sm:grid-cols-2">{trophies.map(t=><div key={t.name} className="rounded-xl border border-white/10 bg-black/20 p-4">
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">{t.name}</h3><Star className={t.n>=t.target?"size-5 text-[#D7FF35]":"size-5 text-zinc-600"}/></div>
    <p className="mt-2 text-xs text-zinc-400">{t.description}</p>
    <p className="mt-3 text-xs font-semibold text-[#D7FF35]">{t.n} / {t.target}</p>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#D7FF35]" style={{width:Math.min(100,t.n/t.target*100)+"%"}}/></div>
  </div>)}</div>
  <a href="/reviews" className="btn-ghost mt-5 inline-flex">Отзывы и рейтинги</a>
 </section>;
}
