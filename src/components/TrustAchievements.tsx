import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
export function TrustAchievements({ userId }: { userId: string }) {
 const [received,setReceived]=useState(0);
 const [given,setGiven]=useState(0);
 useEffect(()=>{
  let ok=true;
  void Promise.all([
   (supabase as any).from("partner_reviews").select("id",{count:"exact",head:true}).eq("reviewed_id",userId),
   (supabase as any).from("partner_reviews").select("id",{count:"exact",head:true}).eq("reviewer_id",userId)
  ]).then(([a,b])=>{if(ok){setReceived(a.count??0);setGiven(b.count??0)}});
  return()=>{ok=false};
 },[userId]);
 const goals=[
  {title:"Первое доверие",n:1,c:received},
  {title:"Надёжный напарник",n:5,c:received},
  {title:"Знают на водоёме",n:10,c:received},
  {title:"Помогаю сообществу",n:3,c:given}
 ];
 return <section className="mb-7 rounded-3xl border border-[#D7FF35]/25 bg-[#151915] p-5 sm:p-7">
 <p className="text-xs font-extrabold uppercase tracking-widest text-[#D7FF35]">ZAPRUDA / ДОВЕРИЕ</p>
 <h2 className="mt-2 text-xl font-black">Ачивки репутации</h2>
 <p className="mt-2 text-xs text-zinc-400">Статистика отзывов о напарниках. Пока без XP и без подтверждения факта встречи.</p>
 <div className="mt-4 grid gap-3 sm:grid-cols-2">{goals.map(g=><div key={g.title} className="rounded-xl border border-white/10 bg-black/20 p-4">
 <h3 className="font-bold">{g.c>=g.n?"🏆 ":"🔒 "}{g.title}</h3><p className="mt-2 text-xs text-zinc-400">{g.c} / {g.n}</p>
 <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#D7FF35]" style={{width:Math.min(100,g.c/g.n*100)+"%"}}/></div>
 </div>)}</div><Link to="/reputation" className="btn-ghost mt-4 inline-flex">Отзывы и репутация</Link>
 </section>;
}