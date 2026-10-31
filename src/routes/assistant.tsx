import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { BrainCircuit, CalendarDays, CheckCircle2, Clock3, Fish, ShieldCheck, Sparkles } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route=createFileRoute("/assistant")({
  head:()=>({meta:[
    {title:"ИИ-рыболов — один персональный совет в день | ZAPRUDA"},
    {name:"description",content:"Один рыболовный совет на день, по профилю и снастям. Журнал запросов и прозрачный лимит."},
  ]}),
  component:Assistant,
});
type Log={id:string;advice_day:string;prompt_summary:string;answer:string;status:"pending"|"ready"|"failed";created_at:string;attempts:number};
const db=supabase as any;

function Assistant(){
 const [uid,setUid]=useState("");
 const [location,setLocation]=useState("");
 const [target,setTarget]=useState("Любой хищник");
 const [time,setTime]=useState("Утро");
 const [notes,setNotes]=useState("");
 const [logs,setLogs]=useState<Log[]>([]);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [answer,setAnswer]=useState("");

 const refresh=async()=>{
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){setUid("");setLoading(false);return;}
   setUid(auth.user.id);
   const [logResult,preferences]=await Promise.all([
     db.from("ai_daily_advices").select("id,advice_day,prompt_summary,answer,status,created_at,attempts")
       .eq("user_id",auth.user.id).order("advice_day",{ascending:false}).limit(14),
     supabase.from("angler_preferences").select("preferred_water,main_technique")
       .eq("user_id",auth.user.id).maybeSingle(),
   ]);
   if(logResult.error)setError("Не удалось прочитать дневной журнал: "+logResult.error.message);
   else {setLogs((logResult.data??[]) as Log[]);setError("");}
   if(preferences.data?.preferred_water)setLocation(current=>current||preferences.data?.preferred_water||"");
   setLoading(false);
 };
 useEffect(()=>{void refresh();},[]);
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const current=logs.find(log=>log.advice_day===today);
 const quotaUsed=current?.status==="ready";
 const latestAnswer=answer||current?.answer||"";

 async function ask(e:FormEvent<HTMLFormElement>){
   e.preventDefault();
   if(busy||!uid||quotaUsed||!location.trim())return;
   setBusy(true);setError("");setNotice("");
   const {data,error:requestError}=await supabase.functions.invoke("zapruda-daily-advice",{
     body:{location:location.trim(),target,time,notes:notes.trim()},
   });
   setBusy(false);
   if(requestError||data?.error){
     let message=data?.error||requestError?.message||"Не удалось получить совет.";
     const context=(requestError as any)?.context;
     if(context&&typeof context.json==="function"){
       try{const payload=await context.json();if(typeof payload?.error==="string")message=payload.error;}catch{}
     }
     setError(message);await refresh();return;
   }
   setAnswer(data.answer||"");
   setNotice(data.already_used?"Совет за сегодня уже был получен.": "Совет получен, запрос записан в журнал.");
   await refresh();
 }

 return <Shell>
   <header className="rounded-3xl border border-[#D7FF35]/25 bg-gradient-to-br from-[#243019] to-[#10150E] p-5 sm:p-8">
     <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#D7FF35]"><BrainCircuit className="size-5"/> ZAPRUDA / AI-РЫБОЛОВ</p>
     <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Один персональный совет в день</h1>
     <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Опиши место и цель, а ИИ учтёт технику и снасти из анкеты. Один успешно полученный совет за календарный день по Москве, без бесконечных генераций.</p>
   </header>
   {loading&&<p className="mt-5 text-sm text-zinc-400">Проверяем дневной лимит…</p>}
   {!loading&&!uid&&<p className="panel mt-5 p-5 text-sm">Для ИИ-совета <Link search={{ mode: "in" }} to="/auth" className="text-[#D7FF35] underline">войти в аккаунт</Link>.</p>}
   {uid&&<div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
     <div className="space-y-4">
       <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D7FF35]/20 bg-[#D7FF35]/5 px-4 py-3">
         <span className="flex items-center gap-2 text-sm font-bold"><CalendarDays className="size-4 text-[#D7FF35]"/> Сегодня · {today}</span>
         <span className={"rounded-lg px-3 py-1.5 text-xs font-bold "+(quotaUsed?"bg-[#D7FF35] text-black":"border border-[#D7FF35]/30 text-[#D7FF35]")}>
           {quotaUsed?"0 из 1 осталось":"1 из 1 совет доступен"}
         </span>
       </div>
       {error&&<p role="alert" className="rounded-xl border border-red-400/30 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>}
       {notice&&<p role="status" className="rounded-xl border border-[#D7FF35]/20 p-3 text-sm text-[#D7FF35]">{notice}</p>}
       {latestAnswer&&<section className="rounded-2xl border border-[#D7FF35]/35 bg-[#151D14] p-5">
         <h2 className="flex items-center gap-2 font-black text-[#D7FF35]"><CheckCircle2 className="size-5"/> Совет на сегодня</h2>
         <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-100">{latestAnswer}</p>
       </section>}
       <form onSubmit={e=>void ask(e)} className="space-y-4 rounded-2xl border border-white/10 bg-[#151A14] p-5">
         <h2 className="font-black">{quotaUsed?"Совет на сегодня уже получен":"Получить персональный совет"}</h2>
         <label className="block text-xs font-semibold text-zinc-300">Водоём / примерное место
           <input required minLength={2} maxLength={140} className="field mt-1 w-full" placeholder="Например, Ока у Мызинского моста" value={location} onChange={e=>setLocation(e.target.value)} disabled={quotaUsed||busy}/>
         </label>
         <div className="grid gap-3 sm:grid-cols-2">
           <label className="block text-xs font-semibold text-zinc-300">Рыба
             <select className="field mt-1 w-full" disabled={quotaUsed||busy} value={target} onChange={e=>setTarget(e.target.value)}>
               {["Любой хищник","Щука","Судак","Окунь","Жерех","Голавль","Сом","Другая рыба"].map(v=><option key={v}>{v}</option>)}
             </select>
           </label>
           <label className="block text-xs font-semibold text-zinc-300">Когда собираешься ловить
             <select className="field mt-1 w-full" disabled={quotaUsed||busy} value={time} onChange={e=>setTime(e.target.value)}>
               {["Утро","День","Вечер","Ночь"].map(v=><option key={v}>{v}</option>)}
             </select>
           </label>
         </div>
         <label className="block text-xs font-semibold text-zinc-300">Что известно о месте (необязательно)
           <textarea className="field mt-1 min-h-20 w-full" maxLength={400} value={notes} onChange={e=>setNotes(e.target.value)}
             placeholder="Например, вода сильно упала, мелко, жерех бьёт на течении" disabled={quotaUsed||busy}/>
         </label>
         <p className="flex items-start gap-2 text-xs leading-5 text-zinc-400"><ShieldCheck className="size-4 shrink-0 text-[#D7FF35]"/>
           ИИ не проверяет актуальную погоду или рельеф в этом разделе. Совет не гарантирует улов. Если сервис ИИ не подключён или не ответил, готовый совет не засчитывается.</p>
         <button className="btn-primary inline-flex min-h-12 items-center gap-2" type="submit" disabled={quotaUsed||!location.trim()||busy}>
           <Sparkles className="size-5"/>{busy?"Формируем совет…":quotaUsed?"Лимит на сегодня использован":"Получить один совет"}
         </button>
       </form>
     </div>
     <aside className="space-y-3 rounded-2xl border border-white/10 bg-[#151915] p-5">
       <h2 className="flex items-center gap-2 font-black"><Clock3 className="size-5 text-[#D7FF35]"/> Журнал ИИ-запросов</h2>
       <p className="text-xs text-zinc-400">Последние 14 дней с запросами. Дата и дневной лимит рассчитываются по Москве.</p>
       {!logs.length&&<p className="text-sm text-zinc-500">Запросов пока нет.</p>}
       {logs.map(log=><details key={log.id} className="rounded-xl border border-white/10 p-3">
         <summary className="cursor-pointer text-xs font-semibold text-zinc-100">
           {log.advice_day} · {log.status==="ready"?"Совет выдан":log.status==="pending"?"В процессе":"Не удалось"}
         </summary>
         <p className="mt-2 text-xs text-zinc-400">{log.prompt_summary||"Запрос без описания"}</p>
         <p className="mt-1 text-[11px] text-zinc-500">Попыток: {log.attempts}</p>
         {log.status==="ready"&&<p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-zinc-300">{log.answer}</p>}
       </details>)}
       <div className="border-t border-white/10 pt-3 text-xs text-zinc-400">
         Нужен более подробный анализ конкретной сохранённой точки и комплекта?
         <Link to="/analytics" search={{mark:""}} className="mt-2 block font-bold text-[#D7FF35] underline">Аналитика Beta для VIP →</Link>
       </div>
     </aside>
   </div>}
 </Shell>;
}
