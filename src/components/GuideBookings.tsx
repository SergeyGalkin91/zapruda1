import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Check, CreditCard, MessageSquareText, ShieldCheck, Wallet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Mode="shore"|"boat";
type Booking={
 id:string; customer_id:string;guide_id:string;service_mode:Mode;planned_at:string;meeting_text:string;
 customer_note:string;agreement_terms:string;amount_rub:number|null;commission_rub:number|null;
 guide_net_rub:number|null;status:"requested"|"quoted"|"awaiting_payment"|"paid"|"canceled"|"refunded";
 payment_method:"bank_card"|"sbp"|null;created_at:string;
};
const db=supabase as any;
const money=(v:number|null)=>v===null?"—":v.toLocaleString("ru-RU")+" ₽";
const modes:{value:Mode;label:string}[]=[
 {value:"shore",label:"С берега"},{value:"boat",label:"С лодки"},
];
const parseError=(e:any)=>typeof e?.message==="string"?e.message:"Не удалось выполнить операцию.";

export function GuideBookingRequest({guideId,guideName,available}:{guideId:string;guideName:string;available:Mode[]}){
 const [uid,setUid]=useState("");
 const [open,setOpen]=useState(false);
 const [mode,setMode]=useState<Mode>(available[0]||"shore");
 const [when,setWhen]=useState("");
 const [location,setLocation]=useState("");
 const [details,setDetails]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 useEffect(()=>{void supabase.auth.getUser().then(({data})=>setUid(data.user?.id||""));},[]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy||!uid||uid===guideId||!available.includes(mode))return;
  if(!when||new Date(when).getTime()<=Date.now()){setError("Укажи будущую дату и время.");return;}
  setBusy(true);setError("");setNotice("");
  const {error:insertError}=await db.from("guide_booking_inquiries").insert({
   customer_id:uid,guide_id:guideId,service_mode:mode,planned_at:new Date(when).toISOString(),
   meeting_text:location.trim(),customer_note:details.trim(),
  });
  setBusy(false);
  if(insertError){setError("Не удалось отправить заявку: "+parseError(insertError));return;}
  setNotice("Заявка отправлена. Гид согласует стоимость и условия. После согласования можно будет выбрать способ оплаты. Деньги пока не списываются.");
  setOpen(false);setWhen("");setLocation("");setDetails("");
 }
 if(uid===guideId)return null;
 return <div className="mt-3">
   <button className="btn-primary inline-flex text-xs" type="button" onClick={()=>setOpen(v=>!v)}>
    <CalendarDays className="size-4"/> {open?"Скрыть заявку":"Запросить выезд и цену"}
   </button>
   {error&&<p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
   {notice&&<p role="status" className="mt-2 text-xs text-[#D7FF35]">{notice}</p>}
   {open&&<form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-[#D7FF35]/25 bg-black/10 p-3">
     <p className="text-xs font-bold text-white">Согласование с гидом «{guideName}»</p>
     <label className="block text-xs text-zinc-300">Формат рыбалки
       <select className="field mt-1 w-full" value={mode} onChange={e=>setMode(e.target.value as Mode)}>
         {modes.filter(m=>available.includes(m.value)).map(m=><option value={m.value} key={m.value}>{m.label}</option>)}
       </select>
     </label>
     <label className="block text-xs text-zinc-300">Дата и время
       <input className="field mt-1 w-full" required type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/>
     </label>
     <label className="block text-xs text-zinc-300">Водоём / район встречи
       <input className="field mt-1 w-full" required minLength={3} maxLength={180} value={location} onChange={e=>setLocation(e.target.value)} placeholder="Например, Ока, Мызинский мост"/>
     </label>
     <label className="block text-xs text-zinc-300">Пожелания (необязательно)
       <textarea className="field mt-1 min-h-20 w-full" maxLength={1000} value={details} onChange={e=>setDetails(e.target.value)} placeholder="Какая рыба интересует, опыт, сколько человек?"/>
     </label>
     <p className="text-xs leading-5 text-zinc-400">Сначала гид предложит цену, программу, условия отмены. Никаких переводов на личные карты в обход платформы; онлайн-оплата картой/СБП пока не активирована.</p>
     <button type="submit" className="btn-primary" disabled={busy||!uid}>{busy?"Отправляем…":"Отправить запрос гиду"}</button>
   </form>}
 </div>;
}

export function GuideBookingInbox(){
 const [uid,setUid]=useState("");
 const [items,setItems]=useState<Booking[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState("");
 const [quotes,setQuotes]=useState<Record<string,{price:string;terms:string}>>({});
 const [methods,setMethods]=useState<Record<string,"bank_card"|"sbp">>({});
 const refresh=useCallback(async()=>{
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){setUid("");setLoading(false);return;}
   const id=auth.user.id;setUid(id);
   const {data,error:e}=await db.from("guide_booking_inquiries")
     .select("id,customer_id,guide_id,service_mode,planned_at,meeting_text,customer_note,agreement_terms,amount_rub,commission_rub,guide_net_rub,status,payment_method,created_at")
     .or("customer_id.eq."+id+",guide_id.eq."+id).order("created_at",{ascending:false}).limit(100);
   if(e)setError("Не удалось загрузить заявки на выезды: "+parseError(e));
   else {setItems((data??[]) as Booking[]);setError("");}
   setLoading(false);
 },[]);
 useEffect(()=>{void refresh();const onFocus=()=>void refresh();window.addEventListener("focus",onFocus);
   return()=>window.removeEventListener("focus",onFocus);},[refresh]);
 async function quote(item:Booking){
   const draft=quotes[item.id];
   if(!draft)return;
   const price=Number(draft.price);
   if(!Number.isInteger(price)||price<100||price>500000||draft.terms.trim().length<10){
     setError("Укажи цену от 100 ₽ и условия договора не короче 10 символов.");return;
   }
   setBusy(item.id);setError("");setNotice("");
   const {error:e}=await db.rpc("quote_guide_booking",{p_id:item.id,p_price:price,p_terms:draft.terms.trim()});
   setBusy("");
   if(e)setError("Цена не согласована: "+parseError(e));
   else {setNotice("Предложение отправлено клиенту. Стоимость с комиссией ZAPRUDA зафиксирована.");await refresh();}
 }
 async function accept(item:Booking){
   const method=methods[item.id]||"bank_card";
   setBusy(item.id);setError("");setNotice("");
   const {error:e}=await db.rpc("accept_guide_quote",{p_id:item.id,p_method:method});
   setBusy("");
   if(e)setError("Не удалось принять условия: "+parseError(e));
   else {setNotice("Условия приняты. Оплата картой/СБП станет доступна после подключения платёжного провайдера. Сейчас деньги не списываются и бронирование не подтверждено.");await refresh();}
 }
 async function cancel(item:Booking){
   if(!window.confirm("Отменить неоплаченную заявку?"))return;
   setBusy(item.id);setError("");setNotice("");
   const {error:e}=await db.rpc("cancel_guide_booking",{p_id:item.id});
   setBusy("");
   if(e)setError("Нельзя отменить: "+parseError(e));
   else{setNotice("Неоплаченная заявка отменена.");await refresh();}
 }
 const isGuide=(b:Booking)=>b.guide_id===uid;
 return <section className="mt-6 rounded-3xl border border-white/10 bg-[#151915] p-5 sm:p-7">
   <h2 className="flex items-center gap-2 text-xl font-black"><MessageSquareText className="size-5 text-[#D7FF35]"/> Мои заявки на рыбалку с гидом</h2>
   <p className="mt-2 text-sm leading-6 text-zinc-400">Здесь согласуются формат, дата, место, фиксированная цена и условия отмены. Оплата внутри ZAPRUDA будет приниматься картой или СБП после подключения лицензированного платёжного сервиса и фискализации.</p>
   {error&&<p role="alert" className="mt-3 rounded-lg border border-red-400/30 p-3 text-sm text-red-200">{error}</p>}
   {notice&&<p role="status" className="mt-3 rounded-lg border border-[#D7FF35]/25 p-3 text-sm text-[#D7FF35]">{notice}</p>}
   {loading&&<p className="mt-3 text-sm text-zinc-400">Загружаем заявки…</p>}
   {!loading&&!items.length&&<p className="mt-3 text-sm text-zinc-500">Пока заявок нет. Найди проверенного гида в «Клубах и сообществах».</p>}
   <div className="mt-4 space-y-4">
     {items.map(item=><div key={item.id} className="space-y-3 rounded-2xl border border-white/10 bg-black/15 p-4">
       <div className="flex flex-wrap justify-between gap-3">
         <p className="font-bold text-white">{isGuide(item)?"Запрос от рыболова":"Мой запрос гиду"} · {item.service_mode==="boat"?"Лодка":"Берег"}</p>
         <span className="rounded-lg border border-white/15 px-2 py-1 text-xs text-[#D7FF35]">
           {({requested:"Ожидает цену",quoted:"Гид предложил условия",awaiting_payment:"Ожидает оплаты",paid:"Оплачено",canceled:"Отменено",refunded:"Возвращено"} as const)[item.status]}
         </span>
       </div>
       <p className="text-xs text-zinc-300">Встреча: {item.meeting_text} · {new Date(item.planned_at).toLocaleString("ru-RU")}</p>
       {item.customer_note&&<p className="text-xs text-zinc-400">Пожелания: {item.customer_note}</p>}
       {item.amount_rub!==null&&<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
         <div className="rounded-xl border border-white/10 p-2"><p className="text-[10px] text-zinc-400">Стоимость</p><p className="font-bold text-white">{money(item.amount_rub)}</p></div>
         <div className="rounded-xl border border-white/10 p-2"><p className="text-[10px] text-zinc-400">Комиссия платформы 10%</p><p className="font-bold text-[#D7FF35]">{money(item.commission_rub)}</p></div>
         <div className="rounded-xl border border-white/10 p-2"><p className="text-[10px] text-zinc-400">Причитается гиду до иных сборов</p><p className="font-bold text-white">{money(item.guide_net_rub)}</p></div>
       </div>}
       {item.agreement_terms&&<p className="whitespace-pre-wrap rounded-lg border border-white/10 p-3 text-xs leading-5 text-zinc-300">{item.agreement_terms}</p>}
       {isGuide(item)&&["requested","quoted"].includes(item.status)&&<div className="space-y-2 rounded-lg border border-[#D7FF35]/20 p-3">
         <p className="text-xs font-bold text-[#D7FF35]">Предложение гида</p>
         <input type="number" min={100} max={500000} className="field w-full" placeholder="Цена за выезд, ₽"
           value={quotes[item.id]?.price ?? (item.amount_rub===null?"":String(item.amount_rub))}
           onChange={e=>setQuotes(v=>({...v,[item.id]:{price:e.target.value,terms:v[item.id]?.terms??item.agreement_terms}}))}/>
         <textarea className="field min-h-20 w-full" maxLength={800} placeholder="Маршрут, длительность, экипировка, условия отмены и переноса…"
           value={quotes[item.id]?.terms??item.agreement_terms}
           onChange={e=>setQuotes(v=>({...v,[item.id]:{price:v[item.id]?.price??(item.amount_rub===null?"":String(item.amount_rub)),terms:e.target.value}}))}/>
         <button className="btn-primary inline-flex" disabled={busy===item.id} type="button" onClick={()=>void quote(item)}>
           <Check className="size-4"/> Отправить стоимость и условия
         </button>
       </div>}
       {!isGuide(item)&&item.status==="quoted"&&<div className="rounded-xl border border-[#D7FF35]/20 p-3">
         <p className="text-xs font-bold">Согласовать условия и выбрать способ оплаты</p>
         <div className="mt-2 flex flex-wrap gap-2">
           {(["bank_card","sbp"] as const).map(m=><label key={m} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs">
             <input type="radio" name={"pay-"+item.id} checked={(methods[item.id]||"bank_card")===m} onChange={()=>setMethods(v=>({...v,[item.id]:m}))}/>
             {m==="bank_card"?<CreditCard className="size-4"/>:<Wallet className="size-4"/>}{m==="bank_card"?"Банковская карта":"СБП"}
           </label>)}
         </div>
         <button className="btn-primary mt-3" type="button" disabled={busy===item.id} onClick={()=>void accept(item)}>
           Согласен с ценой и условиями
         </button>
         <p className="mt-2 text-xs text-amber-200">Переход к фактическому платежу пока отключён. Никаких денег не списывается.</p>
       </div>}
       {item.status==="awaiting_payment"&&<p className="flex items-center gap-2 text-xs text-amber-200">
         <ShieldCheck className="size-4"/> Способ: {item.payment_method==="sbp"?"СБП":"карта"} · платёж не инициирован, бронирование не подтверждено
       </p>}
       {["requested","quoted","awaiting_payment"].includes(item.status)&&<button type="button" disabled={busy===item.id}
         onClick={()=>void cancel(item)} className="btn-ghost inline-flex text-xs"><X className="size-4"/> Отменить заявку</button>}
     </div>)}
   </div>
 </section>;
}
