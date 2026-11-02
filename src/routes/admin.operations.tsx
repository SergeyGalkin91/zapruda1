import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardList, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/operations")({
  head: () => ({ meta: [{ title: "История операций — ZAPRUDA Admin" }] }),
  component: Operations,
});

type Entry = { id: string; category: "club" | "booking" | "request"; title: string; status: string; amount: number | null; when: string; reference?: string };
const money = (value: number | null) => value === null ? "—" : value.toLocaleString("ru-RU") + " ₽";
const date = (value: string) => new Date(value).toLocaleString("ru-RU");

function Operations() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let live = true;
    void (async () => {
      const { data: identity } = await supabase.auth.getUser();
      if (!live) return;
      if (!identity.user) { setLoading(false); return; }
      const { data: role, error: roleError } = await supabase.from("zapruda_admins")
        .select("user_id").eq("user_id", identity.user.id).maybeSingle();
      if (!live) return;
      if (roleError || !role) { setLoading(false); return; }
      setAuthorized(true);
      // Authorization is also required by every table's RLS policy.
      const db = supabase as any;
      const [clubs, bookings, requests] = await Promise.all([
        db.from("club_creation_requests").select("id,name,status,fee_rub,created_at,payment_reference").order("created_at", { ascending: false }).limit(100),
        db.from("guide_booking_inquiries").select("id,status,amount_rub,created_at,provider_payment_id").order("created_at", { ascending: false }).limit(100),
        db.from("community_requests").select("id,subject,review_status,created_at").order("created_at", { ascending: false }).limit(100),
      ]);
      if (!live) return;
      const failures = [clubs.error, bookings.error, requests.error].filter(Boolean);
      if (failures.length) setError("Часть операций недоступна: " + failures.map((e: {message:string}) => e.message).join("; "));
      const rows: Entry[] = [
        ...((clubs.data ?? []) as Array<{id:string;name:string;status:string;fee_rub:number;created_at:string;payment_reference:string|null}>).map(r => ({ id:r.id,category:"club" as const,title:r.name,status:r.status,amount:r.status==="paid" ? r.fee_rub : null,when:r.created_at,reference:r.payment_reference ?? undefined })),
        ...((bookings.data ?? []) as Array<{id:string;status:string;amount_rub:number|null;created_at:string;provider_payment_id:string|null}>).map(r => ({ id:r.id,category:"booking" as const,title:"Бронирование гида",status:r.status,amount:r.status==="paid" || r.status==="completed" ? r.amount_rub : null,when:r.created_at,reference:r.provider_payment_id ?? undefined })),
        ...((requests.data ?? []) as Array<{id:string;subject:string;review_status:string;created_at:string}>).map(r => ({ id:r.id,category:"request" as const,title:r.subject,status:r.review_status,amount:null,when:r.created_at })),
      ].sort((a,b) => b.when.localeCompare(a.when));
      setEntries(rows);
      setLoading(false);
    })().catch(() => { if(live){setError("Ошибка получения истории.");setLoading(false);} });
    return () => { live = false; };
  }, []);

  const shown = filter === "all" ? entries : entries.filter(e => e.category === filter);
  return <Shell><div className="mx-auto max-w-5xl space-y-5">
    <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-[#D7FF35]"><ArrowLeft className="size-4"/> Кабинет администрации</Link>
    <header className="rounded-3xl border border-[#D7FF35]/25 bg-[#151915] p-6">
      <p className="text-xs font-black tracking-widest text-[#D7FF35]">ZAPRUDA / PRIVATE ADMIN</p>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-black"><ClipboardList className="size-6 text-[#D7FF35]"/> История операций</h1>
      <p className="mt-2 text-sm text-zinc-400">Просмотр последних заявок, бронирований и обращений. Это не банковская выписка и не журнал действий администраторов.</p>
    </header>
    {loading && <p className="text-sm text-zinc-400">Загрузка…</p>}
    {!loading && !authorized && <p className="panel p-5 text-sm text-zinc-400">Доступ только назначенному администратору.</p>}
    {error && <p role="alert" className="rounded-xl border border-red-500/30 p-4 text-sm text-red-200">{error}</p>}
    {authorized && <>
      <label className="block text-sm text-zinc-300">Тип операций
        <select className="field mt-2 max-w-xs" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">Все</option><option value="club">Клубы</option>
          <option value="booking">Бронирования гидов</option><option value="request">Обращения</option>
        </select>
      </label>
      <div className="space-y-2">{shown.map(item=><article key={item.category+item.id} className="rounded-2xl border border-white/10 bg-[#151915] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-white">{item.title}</strong><span className="text-xs font-bold text-[#D7FF35]">{item.status}</span></div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
          <span>{item.category==="club"?"Клуб":item.category==="booking"?"Гид":"Обращение"}</span><span>{date(item.when)}</span><span>Учтённая сумма: {money(item.amount)}</span>
        </div>
        {item.reference && <p className="mt-2 break-all text-xs text-zinc-500">Платёжный идентификатор: {item.reference}</p>}
      </article>)}
      {!shown.length && <p className="panel p-5 text-sm text-zinc-400">Операции не найдены.</p>}</div>
      <p className="flex items-start gap-2 text-xs text-zinc-500"><ShieldCheck className="size-4 shrink-0"/> Список ограничен последними 100 записями каждого типа. Редактирование, блокировки и выплаты здесь недоступны до отдельного серверного аудита разрешений.</p>
    </>}
  </div></Shell>;
}
