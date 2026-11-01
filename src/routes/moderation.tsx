import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Check, ExternalLink, ShieldCheck, X } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route=createFileRoute("/moderation")({
  head:()=>({meta:[{title:"Модерация ZAPRUDA — администратор"}]}),
  component:Moderation,
});
type GuideApp={
  user_id:string;legal_name:string;phone_contact:string;experience_details:string;
  boat_document_note:string;evidence_path:string;status:"pending"|"approved"|"rejected";submitted_at:string;
};
type ClubReq={id:string;applicant_id:string;name:string;city:string;fee_rub:number;status:"awaiting_payment"|"paid"|"cancelled";created_at:string};
const db=supabase as any;

function Moderation(){
  const [admin,setAdmin]=useState(false);
  const [loading,setLoading]=useState(true);
  const [guides,setGuides]=useState<GuideApp[]>([]);
  const [clubs,setClubs]=useState<ClubReq[]>([]);
  const [links,setLinks]=useState<Record<string,string>>({});
  const [references,setReferences]=useState<Record<string,string>>({});
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  async function refresh(){
    const {data:auth}=await supabase.auth.getUser();
    if(!auth.user){setAdmin(false);setLoading(false);return;}
    const {data:role,error:roleError}=await db.from("zapruda_admins").select("user_id")
      .eq("user_id",auth.user.id).maybeSingle();
    if(roleError||!role){setAdmin(false);setLoading(false);return;}
    setAdmin(true);
    const [g,c]=await Promise.all([
      db.from("guide_verification_applications")
        .select("user_id,legal_name,phone_contact,experience_details,boat_document_note,evidence_path,status,submitted_at")
        .eq("status","pending").order("submitted_at",{ascending:true}).limit(100),
      db.from("club_creation_requests")
        .select("id,applicant_id,name,city,fee_rub,status,created_at")
        .eq("status","awaiting_payment").order("created_at",{ascending:true}).limit(100),
    ]);
    if(g.error||c.error)setError("Не удалось загрузить заявки: "+(g.error?.message||c.error?.message));
    else setError("");
    setGuides((g.data??[]) as GuideApp[]);
    setClubs((c.data??[]) as ClubReq[]);
    setLoading(false);
  }
  useEffect(()=>{void refresh();},[]);

  async function documentUrl(app:GuideApp){
    const {data,error:linkError}=await supabase.storage.from("guide-verification-private")
      .createSignedUrl(app.evidence_path,60);
    if(linkError){setError("Не удалось открыть приватный документ: "+linkError.message);return;}
    if(data?.signedUrl)setLinks(v=>({...v,[app.user_id]:data.signedUrl}));
  }

  async function reviewGuide(app:GuideApp,approve:boolean){
    if(busy||!window.confirm((approve?"Подтвердить":"Отклонить")+" верификацию гида «"+app.legal_name+"»?"))return;
    setBusy(true);setError("");setNotice("");
    const {error:reviewError}=await db.rpc("review_guide_application",{
      p_user_id:app.user_id,p_approve:approve,p_note:notes[app.user_id]||"",
    });
    setBusy(false);
    if(reviewError){setError("Решение не сохранено: "+reviewError.message);return;}
    setNotice(approve?"Гид подтверждён администратором.":"Заявка отклонена.");
    await refresh();
  }

  async function approveClub(request:ClubReq){
    const reference=(references[request.id]||"").trim();
    if(reference.length<4){setError("Укажи идентификатор РЕАЛЬНО подтверждённого платежа.");return;}
    if(busy||!window.confirm("Ты действительно проверил поступление 500 ₽ по заявке «"+request.name+"»? Без фактического платежа подтверждать нельзя."))return;
    setBusy(true);setError("");setNotice("");
    const {error:approvalError}=await db.rpc("confirm_club_creation_payment",{
      p_request_id:request.id,p_reference:reference,
    });
    setBusy(false);
    if(approvalError){setError("Подтверждение не выполнено: "+approvalError.message);return;}
    setNotice("Платёж подтверждён. Клуб создаётся автоматически после подтверждения. Проверь его в списке клубов.");
    await refresh();
  }

  return <Shell>
    <header className="rounded-3xl border border-[#D7FF35]/25 bg-[#172016] p-5 sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-[#D7FF35]">ZAPRUDA / PRIVATE ADMIN</p>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-black"><ShieldCheck className="size-6 text-[#D7FF35]"/> Проверка заявок</h1>
      <p className="mt-2 text-sm text-zinc-400">Документы гидов и подтверждения платежей. Доступ только назначенным администраторам.</p>
    </header>
    {loading&&<p className="mt-5 text-zinc-400">Проверяем права…</p>}
    {!loading&&!admin&&<div className="mt-5 rounded-xl border border-white/10 p-5 text-sm text-zinc-300">
      Только администратор ZAPRUDA может просматривать заявки.
      <Link to="/" className="ml-2 text-[#D7FF35] underline">Вернуться к ленте</Link>
    </div>}
    {error&&<p role="alert" className="mt-4 rounded-xl border border-red-400/25 p-4 text-sm text-red-200">{error}</p>}
    {notice&&<p role="status" className="mt-4 rounded-xl border border-[#D7FF35]/25 p-4 text-sm text-[#D7FF35]">{notice}</p>}
    {admin&&<div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
      <section className="space-y-3 rounded-2xl border border-white/10 bg-[#151915] p-5">
        <h2 className="flex items-center gap-2 text-lg font-black"><BadgeCheck className="size-5 text-[#D7FF35]"/> Проверка гидов ({guides.length})</h2>
        {!guides.length&&<p className="text-sm text-zinc-500">Нет новых заявок.</p>}
        {guides.map(a=><div className="space-y-3 rounded-xl border border-white/10 p-4 text-sm" key={a.user_id}>
          <p className="font-bold">{a.legal_name}</p>
          <p className="text-xs text-zinc-300">Контакт: {a.phone_contact}</p>
          <p className="text-xs text-zinc-300">Опыт: {a.experience_details||"Не указан"}</p>
          <p className="text-xs text-zinc-300">Лодка и документы: {a.boat_document_note||"Не указано"}</p>
          {links[a.user_id]?<a className="inline-flex items-center gap-1 text-xs text-[#D7FF35] underline"
            href={links[a.user_id]} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3.5"/> Открыть закрытый документ (ссылка 60 сек.)</a>:
            <button type="button" className="btn-ghost text-xs" onClick={()=>void documentUrl(a)}>Открыть документ для проверки</button>}
          <textarea className="field min-h-16 w-full" maxLength={500} placeholder="Причина решения / замечания (необязательно)"
            value={notes[a.user_id]||""} onChange={e=>setNotes(v=>({...v,[a.user_id]:e.target.value}))}/>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} className="btn-primary inline-flex" onClick={()=>void reviewGuide(a,true)}><Check className="size-4"/> Подтвердить</button>
            <button type="button" disabled={busy} className="btn-ghost inline-flex" onClick={()=>void reviewGuide(a,false)}><X className="size-4"/> Отклонить</button>
          </div>
        </div>)}
      </section>
      <section className="space-y-3 rounded-2xl border border-white/10 bg-[#151915] p-5">
        <h2 className="flex items-center gap-2 text-lg font-black">Клубы за 500 ₽ ({clubs.length})</h2>
        <p className="text-xs leading-5 text-zinc-400">Никакого автоматического списания сейчас нет. Подтверждай только фактически поступившие платежи с проверяемым идентификатором.</p>
        {!clubs.length&&<p className="text-sm text-zinc-500">Заявок нет.</p>}
        {clubs.map(q=><div className="space-y-3 rounded-xl border border-white/10 p-4 text-sm" key={q.id}>
          <p className="font-bold">{q.name} · {q.fee_rub} ₽</p>
          <p className="text-xs text-zinc-300">{q.city||"Город не указан"}</p>
          <input className="field w-full" maxLength={180} placeholder="ID проверенного платежа"
            value={references[q.id]||""} onChange={e=>setReferences(v=>({...v,[q.id]:e.target.value}))}/>
          <button type="button" disabled={busy||(references[q.id]||"").trim().length<4}
            className="btn-primary" onClick={()=>void approveClub(q)}>Подтвердить полученные 500 ₽</button>
        </div>)}
      </section>
    </div>}
  </Shell>;
}
