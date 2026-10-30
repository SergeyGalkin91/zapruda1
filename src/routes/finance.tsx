import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CircleDollarSign, CreditCard, Landmark, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route=createFileRoute("/finance")({
 head:()=>({meta:[{title:"Финансы администратора — ZAPRUDA COMMUNITY"}]}),
 component:Finance,
});
type Summary={
 completed_paid_bookings:number;total_guide_payments_rub:number;platform_commission_rub:number;
 guide_amount_rub:number;pending_booking_amount_rub:number;pending_booking_count:number;
 club_payment_confirmed_count:number;club_payment_confirmed_rub:number;
};
const currency=(n:number)=>(n||0).toLocaleString("ru-RU")+" ₽";
const empty:Summary={completed_paid_bookings:0,total_guide_payments_rub:0,
 platform_commission_rub:0,guide_amount_rub:0,pending_booking_amount_rub:0,
 pending_booking_count:0,club_payment_confirmed_count:0,club_payment_confirmed_rub:0};
function Finance(){
 const [authorized,setAuthorized]=useState(false);
 const [summary,setSummary]=useState<Summary>(empty);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
   let active=true;
   void (async()=>{
     const {data:auth,error:authError}=await supabase.auth.getUser();
     if(!active)return;
     if(authError||!auth.user){setLoading(false);return;}
     const {data:admin,error:roleError}=await supabase.from("zapruda_admins")
       .select("user_id").eq("user_id",auth.user.id).maybeSingle();
     if(!active)return;
     if(roleError||!admin){setLoading(false);return;}
     setAuthorized(true);
     const {data,error:summaryError}=await (supabase as any).rpc("admin_finance_summary");
     if(!active)return;
     if(summaryError)setError("Не удалось загрузить финансовую сводку: "+summaryError.message);
     else {
       const info=Array.isArray(data)?data[0]:data;
       if(info)setSummary(Object.fromEntries(Object.keys(empty).map(k=>[k,Number(info[k]||0)])) as Summary);
     }
     setLoading(false);
   })().catch(e=>{if(active){setLoading(false);setError(e instanceof Error?e.message:"Не удалось открыть финансы.");}});
   return()=>{active=false;};
 },[]);
 return <Shell>
   <div className="mx-auto max-w-5xl space-y-6">
     <Link to="/moderation" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-[#D7FF35]"><ArrowLeft className="size-4"/> Администраторские заявки</Link>
     <header className="rounded-3xl border border-[#D7FF35]/25 bg-gradient-to-br from-[#1C2B16] to-[#0C130D] p-5 sm:p-8">
       <p className="text-xs font-black uppercase tracking-widest text-[#D7FF35]">ZAPRUDA / PRIVATE ADMIN / FINANCE</p>
       <h1 className="mt-2 flex items-center gap-2 text-2xl font-black sm:text-3xl"><Landmark className="size-7 text-[#D7FF35]"/> Финансовый кабинет</h1>
       <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">Учёт платежей клубов, бронирований гидов, комиссии платформы и будущих выплат. Суммы подтверждённых поступлений отделены от неоплаченных заявок.</p>
     </header>
     {loading&&<p className="text-sm text-zinc-400">Проверяем права администратора…</p>}
     {!loading&&!authorized&&<p className="rounded-xl border border-white/10 p-5 text-sm text-zinc-400">Раздел доступен только администратору ZAPRUDA.</p>}
     {error&&<p role="alert" className="rounded-xl border border-red-400/30 p-4 text-sm text-red-200">{error}</p>}
     {authorized&&<div className="space-y-6">
       <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
         {([
           ["Выручка с выездов гидов",summary.total_guide_payments_rub,"Только подтверждённые провайдером платежи",CreditCard],
           ["Комиссия ZAPRUDA",summary.platform_commission_rub,"10% подтверждённых выездов до банковских и иных расходов",CircleDollarSign],
           ["Начислено гидам",summary.guide_amount_rub,"Обязательства перед исполнителями, не выводимый остаток",Wallet],
           ["Создание клубов",summary.club_payment_confirmed_rub,"Подтверждения платных заявок на клубы, требуют сверки с банком",ReceiptText],
           ["Неоплаченные бронирования",summary.pending_booking_amount_rub,"Согласованные суммы, не являются доходом",ShieldCheck],
         ] as const).map(([title,value,subtitle,Icon])=><div key={String(title)} className="rounded-2xl border border-white/10 bg-[#151915] p-4">
           <div className="flex items-center gap-2 text-sm font-bold text-zinc-300"><Icon className="size-4 text-[#D7FF35]"/>{String(title)}</div>
           <p className="mt-3 text-2xl font-black text-white">{currency(Number(value))}</p>
           <p className="mt-2 text-xs leading-5 text-zinc-500">{String(subtitle)}</p>
         </div>)}
       </div>
       <section className="rounded-2xl border border-[#D7FF35]/20 bg-[#D7FF35]/5 p-5">
         <h2 className="font-black">Состояние проекта</h2>
         <p className="mt-2 text-sm text-zinc-300">Оплаченных бронирований: {summary.completed_paid_bookings} · ожидают оплаты: {summary.pending_booking_count} · подтверждений клуба: {summary.club_payment_confirmed_count}</p>
         <p className="mt-3 text-xs leading-6 text-zinc-400">Это аналитический кабинет, а не банковский счёт. Баланс ЮKassa, фактическая сумма на расчётном счёте, возвраты, комиссия эквайринга, НДС и фактические выплаты гидам будут отображаться после подключения платёжного провайдера, сверки платежей и надлежащих фискальных документов.</p>
       </section>
       <section className="rounded-2xl border border-white/10 bg-[#151915] p-5">
         <h2 className="font-black">Вывод средств / выплаты</h2>
         <p className="mt-2 text-sm leading-6 text-zinc-400">Пока недоступно. Для будущего вывода средств ZAPRUDA нужен договор с платёжным провайдером и законные реквизиты получателя. Не будем хранить номера личных банковских карт или запускать вывод средств без проверенной платёжной интеграции.</p>
         <button disabled type="button" className="btn-ghost mt-4 opacity-50">Вывести средства · подключим позднее</button>
       </section>
       <Link to="/moderation" className="btn-ghost inline-flex">Перейти к заявкам и документам →</Link>
     </div>}
   </div>
 </Shell>;
}
