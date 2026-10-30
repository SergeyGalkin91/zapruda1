import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
export const Route=createFileRoute("/reputation")({component:Reputation,head:()=>({meta:[{title:"Репутация и отзывы — ZAPRUDA"}]})});
type Review={id:string;reviewer_id:string;reviewed_id:string;rating:number;body:string;created_at:string};
type Request={id:string;applicant_id:string;trip:{organizer_id:string;departure_at:string}|null};
function Reputation(){
 const [uid,setUid]=useState("");const [reviews,setReviews]=useState<Review[]>([]);
 const [requests,setRequests]=useState<Request[]>([]);const [names,setNames]=useState<Record<string,string>>({});
 const [choice,setChoice]=useState("");const [rating,setRating]=useState(5);const [body,setBody]=useState("");
 const [error,setError]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;void (async()=>{
  const {data}=await supabase.auth.getUser();if(!live||!data.user)return;const id=data.user.id;setUid(id);
  const [a,b]=await Promise.all([(supabase as any).from("partner_reviews").select("id,reviewer_id,reviewed_id,rating,body,created_at").order("created_at",{ascending:false}).limit(100),(supabase as any).from("partner_trip_requests").select("id,applicant_id,trip:partner_trips(organizer_id,departure_at)").eq("status","accepted").limit(200)]);
  if(!live)return;if(a.error)setError(a.error.message);else setReviews(a.data??[]);
  if(b.error)setError(b.error.message);else setRequests((b.data??[]) as Request[]);
  const ids=Array.from(new Set([...(a.data??[]).flatMap((r:Review)=>[r.reviewer_id,r.reviewed_id]),...(b.data??[]).flatMap((r:Request)=>r.trip?[r.applicant_id,r.trip.organizer_id]:[])])) as string[];
  if(ids.length){const p=await supabase.from("profiles").select("id,username,display_name").in("id",ids);
   if(live&&p.data)setNames(Object.fromEntries(p.data.map(x=>[x.id,x.username?"@"+x.username:x.display_name||"Участник"])));}
 })();return()=>{live=false}},[message]);
 const eligible=requests.filter(r=>r.trip&&new Date(r.trip.departure_at).getTime()<Date.now()&&(r.applicant_id===uid||r.trip.organizer_id===uid)).map(r=>({request:r.id,other:r.applicant_id===uid?r.trip!.organizer_id:r.applicant_id}));
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!uid||busy)return;const [trip_request_id,reviewed_id]=choice.split("|");setBusy(true);setError("");
 const res=await (supabase as any).from("partner_reviews").insert({trip_request_id,reviewed_id,reviewer_id:uid,rating,body:body.trim()});
 if(res.error)setError(res.error.message);else{setChoice("");setBody("");setMessage("Отзыв сохранён");}setBusy(false)};
 const score=Object.entries(reviews.reduce((a:Record<string,{sum:number;count:number}>,r)=>{const n=a[r.reviewed_id]??{sum:0,count:0};a[r.reviewed_id]={sum:n.sum+r.rating,count:n.count+1};return a},{}));
 return <Shell><p className="text-xs font-black uppercase tracking-widest text-[#D7FF35]">ZAPRUDA / ДОВЕРИЕ</p>
 <h1 className="mt-2 flex items-center gap-2 text-3xl font-black"><Star className="text-[#D7FF35]"/> Репутация и отзывы</h1>
 <p className="mt-3 text-sm text-zinc-400">Отзывы о напарниках по принятым заявкам после даты рыбалки. Оценки отражают мнение участников, а не гарантию безопасности.</p>
 {!uid?<p className="mt-5">Для отзывов <Link to="/auth" className="text-[#D7FF35]">войди в аккаунт</Link>.</p>:<>
 <section className="my-6 rounded-2xl border border-white/10 bg-[#151915] p-5"><h2 className="text-xl font-bold">Оставить отзыв</h2>
 <p className="mt-2 text-xs text-zinc-400">Факт личной встречи пока дополнительно не подтверждается.</p>
 {error&&<p role="alert" className="mt-3 text-red-300">{error}</p>}{message&&<p role="status" className="mt-3 text-[#D7FF35]">{message}</p>}
 <form onSubmit={submit} className="mt-4 space-y-3">
 <label className="block text-sm">Напарник<select className="field mt-2" value={choice} onChange={e=>setChoice(e.target.value)} required><option value="">Выбери выезд</option>{eligible.map(x=><option key={x.request} value={x.request+"|"+x.other}>{names[x.other]||"Участник"} · {x.request.slice(0,8)}</option>)}</select></label>
 <label className="block text-sm">Оценка<select className="field mt-2" value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label>
 <label className="block text-sm">Отзыв<textarea className="field mt-2 min-h-28" required minLength={20} maxLength={1200} value={body} onChange={e=>setBody(e.target.value)}/></label>
 <button className="btn-primary" type="submit" disabled={busy||!choice||body.trim().length<20}>Опубликовать</button></form></section>
 <h2 className="mb-3 text-xl font-bold">Рейтинг напарников</h2><div className="grid gap-3 sm:grid-cols-2">{score.map(([id,s])=><div key={id} className="rounded-xl border border-white/10 p-4"><p className="font-bold text-[#D7FF35]">{names[id]||"Участник"}</p><p>★ {(s.sum/s.count).toFixed(1)} · {s.count} отзывов</p></div>)}</div>
 <h2 className="mb-3 mt-6 text-xl font-bold">Отзывы</h2><div className="space-y-3">{reviews.map(r=><article key={r.id} className="rounded-xl border border-white/10 bg-[#151915] p-4"><p className="font-bold text-[#D7FF35]">{names[r.reviewed_id]||"Участник"} · ★ {r.rating}</p><p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p><p className="mt-2 text-xs text-zinc-500">От {names[r.reviewer_id]||"участника"}</p></article>)}</div></>}
 </Shell>;
}
