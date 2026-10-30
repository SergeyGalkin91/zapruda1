import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, ShieldCheck, MessageSquareText } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reviews")({
  head: () => ({ meta: [{ title: "Отзывы и доверие — ZAPRUDA" }] }),
  component: Reviews,
});
type Review = { id: string; reviewer_id: string; reviewed_id: string; rating: number; body: string; created_at: string; trip_id: string };
type Eligible = { tripId: string; reviewedId: string; label: string };
function Reviews() {
  const [userId,setUserId] = useState<string|null>(null);
  const [reviews,setReviews] = useState<Review[]>([]);
  const [eligible,setEligible] = useState<Eligible[]>([]);
  const [names,setNames] = useState<Record<string,string>>({});
  const [selected,setSelected] = useState("");
  const [rating,setRating] = useState(5);
  const [body,setBody] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  async function load() {
    const {data:auth} = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;
    setUserId(uid);
    const {data:all,error:readError} = await (supabase as any).from("trip_reviews").select("id,reviewer_id,reviewed_id,rating,body,created_at,trip_id").order("created_at",{ascending:false}).limit(100);
    if(readError){ setError(readError.message); return; }
    const list = (all??[]) as Review[];
    setReviews(list);
    const options:Eligible[]=[];
    if(uid) {
      const {data:requests} = await supabase.from("partner_trip_requests").select("trip_id,applicant_id,status").eq("status","accepted").limit(300);
      const {data:trips} = await supabase.from("partner_trips").select("id,organizer_id,destination,departure_at,trip_kind").eq("trip_kind","community").lt("departure_at",new Date(Date.now()-7200000).toISOString()).limit(200);
      for(const trip of trips??[]) {
        const members = (requests??[]).filter(r=>r.trip_id===trip.id);
        if(trip.organizer_id===uid) {
          for(const request of members) if(request.applicant_id!==uid) options.push({tripId:trip.id,reviewedId:request.applicant_id,label:trip.destination});
        } else if(members.some(r=>r.applicant_id===uid)) options.push({tripId:trip.id,reviewedId:trip.organizer_id,label:trip.destination});
      }
    }
    const ids=[...new Set([...list.flatMap(x=>[x.reviewer_id,x.reviewed_id]),...options.map(x=>x.reviewedId)])];
    if(ids.length) {
      const {data:profiles} = await supabase.from("profiles").select("id,username,display_name").in("id",ids);
      const result:Record<string,string>={};
      for(const p of profiles??[]) result[p.id]=p.username ? "@"+p.username : p.display_name||"Рыболов";
      setNames(result);
    }
    setEligible(options.filter(x=>!list.some(r=>r.trip_id===x.tripId&&r.reviewer_id===uid&&r.reviewed_id===x.reviewedId)));
  }
  useEffect(()=>{void load();},[]);
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const option=eligible.find(x=>x.tripId+":"+x.reviewedId===selected);
    if(!option||!userId||busy||body.trim().length<15)return;
    setBusy(true);setError("");setNotice("");
    const {error:submitError}=await (supabase as any).from("trip_reviews").insert({trip_id:option.tripId,reviewer_id:userId,reviewed_id:option.reviewedId,rating,body:body.trim()});
    setBusy(false);
    if(submitError){setError(submitError.message);return;}
    setBody("");setSelected("");setNotice("Отзыв опубликован.");await load();
  }
  return <Shell>
    <header className="mb-7">
      <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D7FF35]">ZAPRUDA / ДОВЕРИЕ</p>
      <h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><Star className="size-8 text-[#D7FF35]"/> Отзывы о рыболовах</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Отзывы после подтверждённых совместных выездов. Ник автора и получателя — ссылки на их публичные карточки.</p>
    </header>
    {error&&<p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
    {notice&&<p role="status" className="mb-4 text-sm text-[#D7FF35]">{notice}</p>}
    {userId&&<section className="mb-8 rounded-3xl border border-[#D7FF35]/20 bg-[#151915] p-5 sm:p-7">
      <h2 className="text-xl font-bold">Оставить отзыв после рыбалки</h2>
      <p className="mt-2 text-sm text-zinc-400">Оценить можно только участника подтверждённой заявки после даты выезда. Один отзыв на человека за один выезд.</p>
      {eligible.length===0?<p className="mt-4 text-sm text-zinc-400">Пока нет доступных выездов для отзыва.</p>:
      <form onSubmit={e=>void submit(e)} className="mt-4 space-y-4">
        <label className="block text-sm font-semibold">Участник и выезд
          <select className="field mt-2" required value={selected} onChange={e=>setSelected(e.target.value)}>
            <option value="">Выбери рыбалку</option>
            {eligible.map(x=><option key={x.tripId+":"+x.reviewedId} value={x.tripId+":"+x.reviewedId}>{names[x.reviewedId]||"Рыболов"} · {x.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">Оценка
          <select className="field mt-2" value={rating} onChange={e=>setRating(Number(e.target.value))}>
            {[5,4,3,2,1].map(n=><option key={n} value={n}>{n} из 5</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">Отзыв
          <textarea className="field mt-2 min-h-28 w-full" minLength={15} maxLength={1200} required value={body} onChange={e=>setBody(e.target.value)} placeholder="Как прошла рыбалка? Пунктуальность, общение, безопасность…"/>
        </label>
        <button className="btn-primary" disabled={busy||!selected||body.trim().length<15} type="submit">{busy?"Публикуем…":"Опубликовать отзыв"}</button>
      </form>}
    </section>}
    <div className="mb-5 flex items-center gap-2 text-sm text-zinc-400"><ShieldCheck className="size-5 text-[#D7FF35]"/> Рейтинг основан на опубликованных отзывах, а не на покупке баллов.</div>
    {reviews.length===0?<div className="rounded-2xl border border-white/10 p-6 text-zinc-400">Пока отзывов нет. Первый появится после подтверждённого совместного выезда.</div>:
      <div className="grid gap-3">{reviews.map(x=><article key={x.id} className="rounded-2xl border border-white/10 bg-[#151915] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/anglers/$userId" params={{userId:x.reviewed_id}} className="font-bold text-[#D7FF35] hover:underline">{names[x.reviewed_id]||"Рыболов"}</Link>
          <span className="text-xs text-zinc-500">получил отзыв от</span>
          <Link to="/anglers/$userId" params={{userId:x.reviewer_id}} className="font-bold hover:underline">{names[x.reviewer_id]||"Участник"}</Link>
          <span className="ml-auto text-sm text-[#D7FF35]">{"★".repeat(x.rating)}{"☆".repeat(5-x.rating)}</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-zinc-200">{x.body}</p>
        <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500"><MessageSquareText className="size-4"/> {new Date(x.created_at).toLocaleDateString("ru-RU")} · Совместный выезд</p>
      </article>)}</div>}
    <p className="mt-6 text-xs text-zinc-500">Отзывы о платных гидах подключим после проверки фактического завершения бронирования и оплаты. Одного созданного заказа недостаточно.</p>
  </Shell>;
}
