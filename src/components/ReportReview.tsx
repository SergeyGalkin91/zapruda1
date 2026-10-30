import { useState } from "react";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function ReportReview({ reviewId, source }: { reviewId: string; source: "partner" | "guide" }) {
 const [open,setOpen]=useState(false);
 const [reason,setReason]=useState("fake");
 const [details,setDetails]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 async function send(){
  if(busy)return;
  setBusy(true);setNotice("");
  const {data}=await supabase.auth.getUser();
  if(!data.user){setNotice("Чтобы пожаловаться, войди в аккаунт.");setBusy(false);return;}
  const {error}=await (supabase as any).from("review_reports").insert({
   reporter_id:data.user.id,review_source:source,review_id:reviewId,reason,details:details.trim()
  });
  setBusy(false);
  if(error){
   setNotice(error.code==="23505"?"Жалоба уже отправлена.":"Не удалось отправить жалобу. Попробуй позже.");
  }else{setNotice("Жалоба сохранена для рассмотрения.");setOpen(false);setDetails("");}
 }
 return <div className="mt-3">
  <button type="button" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-200" onClick={()=>setOpen(!open)} aria-expanded={open}><Flag className="size-3.5"/> Пожаловаться на отзыв</button>
  {open&&<div className="mt-3 grid max-w-sm gap-2 rounded-xl border border-white/10 bg-black/25 p-3">
   <label className="text-xs font-semibold">Причина жалобы
    <select className="field mt-1 w-full" value={reason} onChange={e=>setReason(e.target.value)}>
     <option value="fake">Недостоверный отзыв</option><option value="abuse">Оскорбления</option><option value="privacy">Личные данные</option><option value="spam">Спам</option><option value="other">Другое</option>
    </select>
   </label>
   <textarea className="field min-h-20 w-full text-sm" aria-label="Дополнительные сведения" value={details} maxLength={500} onChange={e=>setDetails(e.target.value)} placeholder="Дополнительные сведения (необязательно)"/>
   <button type="button" className="btn-ghost justify-center" disabled={busy} onClick={()=>void send()}>{busy?"Отправляем…":"Отправить жалобу"}</button>
  </div>}
  {notice&&<p role="status" className="mt-2 text-xs text-zinc-300">{notice}</p>}
 </div>;
}
