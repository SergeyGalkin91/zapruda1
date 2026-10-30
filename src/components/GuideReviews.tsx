import { useEffect, useState } from "react";
import { Star, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReportReview } from "@/components/ReportReview";

type Booking={id:string;guide_id:string;planned_at:string;paid_at:string|null;provider_payment_id:string|null};
type Review={id:string;author_id:string;target_id:string;stars:number;body:string;created_at:string};
export function GuideReviews() {
 const [bookings,setBookings]=useState<Booking[]>([]);
 const [reviews,setReviews]=useState<Review[]>([]);
 const [names,setNames]=useState<Record<string,string>>({});
 const [selected,setSelected]=useState("");
 const [stars,setStars]=useState(5);
 const [body,setBody]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 async function refresh(){
  const {data:auth}=await supabase.auth.getUser();
  const [past,publicReviews]=await Promise.all([
   auth.user?(supabase as any).from("guide_booking_inquiries").select("id,guide_id,planned_at,paid_at,provider_payment_id").eq("customer_id",auth.user.id).eq("status","paid").lt("planned_at",new Date(Date.now()-7200000).toISOString()):Promise.resolve({data:[]}),
   (supabase as any).from("angler_reviews").select("id,author_id,target_id,stars,body,created_at").eq("context","guide").order("created_at",{ascending:false}).limit(100)
  ]);
  if(publicReviews.error){setError(publicReviews.error.message);return;}
  setReviews(publicReviews.data||[]);
  const eligible=(past.data||[]).filter((b:Booking)=>b.paid_at&&b.provider_payment_id);
  setBookings(eligible);
  const ids=[...new Set([...eligible.map((b:Booking)=>b.guide_id),...(publicReviews.data||[]).flatMap((r:Review)=>[r.target_id,r.author_id])])];
  if(ids.length){
   const {data:profiles}=await supabase.from("profiles").select("id,username,display_name").in("id",ids);
   setNames(Object.fromEntries((profiles||[]).map(p=>[p.id,p.username?"@"+p.username:p.display_name||"Рыболов"])));
  }
 }
 useEffect(()=>{void refresh();},[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!selected||busy)return;
  const b=bookings.find(b=>b.id===selected);if(!b)return;
  setBusy(true);setError("");setNotice("");
  const {error:failed}=await (supabase as any).rpc("submit_angler_review",{p_context:"guide",p_source:b.id,p_target:b.guide_id,p_stars:stars,p_body:body.trim()});
  setBusy(false);
  if(failed){setError(failed.message);return;}
  setNotice("Отзыв о гиде опубликован.");setSelected("");setBody("");await refresh();
 }
 const stats=new Map<string,{sum:number;count:number}>();
 for(const r of reviews){const x=stats.get(r.target_id)||{sum:0,count:0};x.sum+=r.stars;x.count++;stats.set(r.target_id,x);}
 return <section className="mt-8 rounded-3xl border border-[#D7FF35]/20 bg-[#151915] p-5 sm:p-7">
  <p className="text-xs font-black uppercase tracking-widest text-[#D7FF35]">ZAPRUDA / ГИДЫ</p>
  <h2 className="mt-2 flex items-center gap-2 text-xl font-bold"><ShieldCheck className="size-5 text-[#D7FF35]"/> Отзывы о гидах</h2>
  <p className="mt-2 text-xs leading-5 text-zinc-400">Оценка доступна клиенту после запланированной даты оплаченного бронирования. Оплата не подтверждает фактическое проведение рыбалки; рейтинги учитывай вместе с количеством отзывов.</p>
  {!!bookings.length&&<form onSubmit={e=>void submit(e)} className="mt-4 grid gap-3">
    <label className="text-sm font-semibold">Выбери гида
      <select required className="field mt-2 w-full" value={selected} onChange={e=>setSelected(e.target.value)}>
       <option value="">Выбери бронирование</option>
       {bookings.map(b=><option key={b.id} value={b.id}>{names[b.guide_id]||"Гид"} · {new Date(b.planned_at).toLocaleDateString("ru-RU")}</option>)}
      </select>
    </label>
    <label className="text-sm font-semibold">Оценка
      <select className="field mt-2" value={stars} onChange={e=>setStars(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option value={n} key={n}>{n} из 5</option>)}</select>
    </label>
    <textarea aria-label="Текст отзыва о гиде" className="field min-h-28" required minLength={12} maxLength={800} value={body} onChange={e=>setBody(e.target.value)} placeholder="Пунктуальность, помощь, безопасность, работа гида…"/>
    <button type="submit" className="btn-primary" disabled={busy||!selected}>{busy?"Отправляем…":"Оставить отзыв о гиде"}</button>
  </form>}
  {error&&<p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
  {notice&&<p role="status" className="mt-3 text-xs text-[#D7FF35]">{notice}</p>}
  <div className="mt-5 space-y-3">{reviews.length===0?<p className="text-sm text-zinc-400">Пока нет отзывов о гидах.</p>:reviews.map(r=>{
   const stat=stats.get(r.target_id);
   return <article key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
    <div className="flex flex-wrap justify-between gap-2"><a href={"/anglers/"+encodeURIComponent(r.target_id)} className="font-bold text-[#D7FF35]">{names[r.target_id]||"Гид"}</a><span className="text-sm text-[#D7FF35]"><Star className="mr-1 inline size-4"/>{r.stars}/5</span></div>
    <p className="mt-1 text-xs text-zinc-500">Рейтинг: {stat?(stat.sum/stat.count).toFixed(1):"—"} · {stat?.count||0} отзывов</p>
    <p className="mt-3 whitespace-pre-wrap break-words text-sm">{r.body}</p>
    <ReportReview reviewId={r.id} source="guide"/>
    <p className="mt-2 text-xs text-zinc-500">Автор: {names[r.author_id]||"Участник"} · {new Date(r.created_at).toLocaleDateString("ru-RU")}</p>
   </article>;
  })}</div>
 </section>;
}
