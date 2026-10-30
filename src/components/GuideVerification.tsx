import { useEffect, useState, type FormEvent } from "react";
import { FileCheck2, LockKeyhole, ShieldCheck, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Application = { status:"pending"|"approved"|"rejected"; reviewer_note:string; submitted_at:string; evidence_path:string };
type Verification = { verified_at:string|null; revoked_at:string|null };
const db=supabase as any;

export function GuideVerification({userId,guideSaved,onVerificationChange}:{userId:string;guideSaved:boolean;onVerificationChange:(verified:boolean)=>void}) {
  const [application,setApplication]=useState<Application|null>(null);
  const [verified,setVerified]=useState(false);
  const [legalName,setLegalName]=useState("");
  const [phone,setPhone]=useState("");
  const [experience,setExperience]=useState("");
  const [docNote,setDocNote]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  async function refresh(){
    const [v,a]=await Promise.all([
      db.from("guide_verifications").select("verified_at,revoked_at").eq("user_id",userId).maybeSingle(),
      db.from("guide_verification_applications").select("status,reviewer_note,submitted_at,evidence_path").eq("user_id",userId).maybeSingle(),
    ]);
    if(v.error || a.error){setError("Не удалось проверить статус: "+(v.error?.message||a.error?.message));return;}
    const active=Boolean((v.data as Verification|null)?.verified_at && !(v.data as Verification|null)?.revoked_at);
    setVerified(active);
    onVerificationChange(active);
    setApplication(a.data as Application|null);
  }
  useEffect(()=>{void refresh();},[userId]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(busy||!guideSaved||application||!file)return;
    const accepted=["application/pdf","image/jpeg","image/png"];
    if(!accepted.includes(file.type)||file.size>5_000_000||file.size===0){setError("Документ должен быть PDF, JPG или PNG до 5 МБ.");return;}
    if(legalName.trim().length<5||phone.trim().length<7){setError("Укажи имя и контакт для проверки.");return;}
    setBusy(true);setError("");setNotice("");
    const extension=file.type==="application/pdf"?"pdf":file.type==="image/png"?"png":"jpg";
    const path=userId+"/guide-document-"+crypto.randomUUID()+"."+extension;
    const {error:uploadError}=await supabase.storage.from("guide-verification-private").upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError){setError("Не удалось загрузить приватный документ: "+uploadError.message);setBusy(false);return;}
    const {error:applicationError}=await db.from("guide_verification_applications").insert({
      user_id:userId,legal_name:legalName.trim(),phone_contact:phone.trim(),
      experience_details:experience.trim(),boat_document_note:docNote.trim(),evidence_path:path,
    });
    setBusy(false);
    if(applicationError){setError("Документ загружен, но заявка не отправлена: "+applicationError.message);return;}
    setNotice("Заявка получена. Статус «Проверенный гид» появится только после решения администратора.");
    await refresh();
  }

  return <section className="mt-6 rounded-3xl border border-[#D7FF35]/20 bg-[#151915] p-5 sm:p-7" aria-labelledby="guide-check-title">
    <p className="text-xs font-extrabold uppercase tracking-widest text-[#D7FF35]">02 / Доверие и безопасность</p>
    <h2 id="guide-check-title" className="mt-2 flex items-center gap-2 text-xl font-black">
      <ShieldCheck className="size-5 text-[#D7FF35]"/> Верификация рыболовного гида
    </h2>
    <p className="mt-2 text-sm leading-6 text-zinc-400">
      Простая анкета не делает человека проверенным гидом. Администратор вручную сверяет предоставленные сведения и документ.
      Без подтверждения нельзя публиковать коммерческие выезды, включая лодку с Panoptix/LiveScope.
    </p>
    {error&&<p role="alert" className="mt-4 rounded-xl border border-red-400/25 p-3 text-sm text-red-200">{error}</p>}
    {notice&&<p role="status" className="mt-4 text-sm text-[#D7FF35]">{notice}</p>}
    <div className={"mt-4 rounded-xl border p-4 text-sm "+
      (verified?"border-[#D7FF35]/40 bg-[#D7FF35]/10":"border-white/10 bg-black/15")}>
      <strong className="flex items-center gap-2">
        {verified?<FileCheck2 className="size-5 text-[#D7FF35]"/>:<LockKeyhole className="size-5 text-zinc-400"/>}
        {verified?"✓ Проверенный гид ZAPRUDA":application?.status==="pending"?"Заявка на проверке":application?.status==="rejected"?"Верификация не пройдена":"Проверка ещё не пройдена"}
      </strong>
      {application?.reviewer_note&&<p className="mt-2 text-xs text-zinc-300">Комментарий администрации: {application.reviewer_note}</p>}
      {application?.status==="rejected"&&<p className="mt-2 text-xs text-zinc-400">Для повторной проверки или исправления документа свяжись с поддержкой через раздел «Предложения и сотрудничество».</p>}
    </div>
    {!application&&!verified&&<form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-semibold text-zinc-300">ФИО для внутренней проверки
        <input className="field mt-1" required minLength={5} maxLength={120} autoComplete="name" value={legalName} onChange={e=>setLegalName(e.target.value)}/>
      </label>
      <label className="text-xs font-semibold text-zinc-300">Контакт для связи администрации
        <input className="field mt-1" required minLength={7} maxLength={35} placeholder="Телефон или иной контакт" value={phone} onChange={e=>setPhone(e.target.value)}/>
      </label>
      <label className="text-xs font-semibold text-zinc-300">Опыт и направления
        <textarea className="field mt-1 min-h-20" maxLength={800} value={experience} onChange={e=>setExperience(e.target.value)} placeholder="Сколько лет водишь выезды, по каким водоёмам"/>
      </label>
      <label className="text-xs font-semibold text-zinc-300">Лодка, право управления и оборудование
        <textarea className="field mt-1 min-h-20" maxLength={500} value={docNote} onChange={e=>setDocNote(e.target.value)} placeholder="Марка лодки, регистрация (если применимо), Panoptix / LiveScope"/>
      </label>
      <label className="text-xs font-semibold text-zinc-300 sm:col-span-2">
        Подтверждающий документ (PDF/JPG/PNG до 5 МБ)
        <input type="file" required accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={e=>setFile(e.target.files?.[0]??null)}
          className="mt-2 block w-full rounded-xl border border-white/15 p-3 text-xs text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#D7FF35] file:px-3 file:py-2 file:font-bold file:text-black"/>
        <span className="mt-2 block text-xs leading-5 text-zinc-500">Загружай только документы, которые действительно нужны для подтверждения услуг. Не публикуй паспорт или персональные сведения в открытых чатах. Файл хранится в закрытом хранилище и доступен владельцу и администраторам.</span>
      </label>
      <button className="btn-primary inline-flex items-center justify-center gap-2 sm:col-span-2 sm:justify-self-start" type="submit" disabled={!guideSaved||busy||!file}>
        <UploadCloud className="size-4"/>{busy?"Отправляем заявку…":"Отправить заявку на верификацию"}
      </button>
      {!guideSaved&&<p className="text-xs text-amber-200 sm:col-span-2">Сначала сохрани профиль гида выше.</p>}
    </form>}
  </section>;
}
