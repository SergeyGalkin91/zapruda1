import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, UserRound } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/anglers/$userId")({component: Page});
type Review={id:string;rating:number;body:string;reviewer_id:string;created_at:string};
function Page(){
 const {userId}=Route.useParams();
 const [name,setName]=useState("Рыболов");
 const [reviews,setReviews]=useState<Review[]>([]);
 const [authors,setAuthors]=useState<Record<string,string>>({});
 const [error,setError]=useState("");
 useEffect(()=>{
  let live=true;
  void (async()=>{
   const [p,r]=await Promise.all([
    supabase.from("profiles").select("username,display_name").eq("id",userId).maybeSingle(),
    (supabase as any).from("trip_reviews").select("id,rating,body,reviewer_id,created_at").eq("reviewed_id",userId).order("created_at",{ascending:false}).limit(100)
   ]);
   if(!live)return;
   if(p.error||r.error){setError(p.error?.message||r.error?.message||"Ошибка загрузки");return;}
   setName(p.data?.username?"@"+p.data.username:p.data?.display_name||"Рыболов");
   const rows=(r.data??[]) as Review[];setReviews(rows);
   const ids=[...new Set(rows.map(x=>x.reviewer_id))];
   if(ids.length){const {data:profiles}=await supabase.from("profiles").select("id,username,display_name").in("id",ids);
    const names:Record<string,string>={};
    for(const x of profiles??[])names[x.id]=x.username?"@"+x.username:x.display_name||"Участник";
    if(live)setAuthors(names);
   }
  })();
  return ()=>{live=false};
 },[userId]);
 const mean=reviews.length?(reviews.reduce((sum,r)=>sum+r.rating,0)/reviews.length).toFixed(1):"—";
 return <Shell>
  <Link to="/reviews" className="text-sm font-bold text-[#D7FF35]">← Все отзывы</Link>
  <section className="mt-5 rounded-3xl border border-[#D7FF35]/20 bg-[#151915] p-6">
   <UserRound className="size-9 text-[#D7FF35]"/>
   <h1 className="mt-3 text-3xl font-black">{name}</h1>
   <p className="mt-2 text-sm text-zinc-400">Репутация рыболова по отзывам после совместных выездов</p>
   <div className="mt-5 flex items-center gap-3"><Star className="size-7 text-[#D7FF35]"/><span className="text-3xl font-black">{mean}</span><span className="text-sm text-zinc-400">{reviews.length} отзывов</span></div>
   <p className="mt-3 text-xs text-zinc-500">Рейтинг ориентировочный. Отзывы подтверждены фактом принятой заявки, но не независимой проверкой присутствия.</p>
  </section>
  {error&&<p role="alert" className="mt-4 text-red-300">{error}</p>}
  <div className="mt-6 space-y-3">{reviews.map(r=><article key={r.id} className="rounded-xl border border-white/10 bg-[#151915] p-5">
   <div className="flex justify-between gap-3"><Link to="/anglers/$userId" params={{userId:r.reviewer_id}} className="font-bold text-[#D7FF35]">{authors[r.reviewer_id]||"Участник"}</Link><span className="text-[#D7FF35]">{"★".repeat(r.rating)}</span></div>
   <p className="mt-3 whitespace-pre-wrap break-words text-sm">{r.body}</p>
   <p className="mt-2 text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString("ru-RU")}</p>
  </article>)}</div>
 </Shell>;
}
