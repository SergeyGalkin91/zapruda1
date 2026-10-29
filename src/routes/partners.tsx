import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight, CalendarDays, CarFront, Check, CircleDollarSign, Clock3,
  Fish, MapPin, MessageCircle, Plus, RefreshCw, Send, ShieldCheck, SlidersHorizontal,
  Users, X, Ship, Waves, ShieldAlert, Ban,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Напарники на рыбалку — ZAPRUDA" },
      { name: "description", content: "Найди компанию на выезд: город, дата, транспорт и понятные финансовые условия." },
    ],
  }),
  component: Partners,
});

type Profile = { username: string | null; display_name: string | null; avatar_url: string | null };
type Trip = {
  id: string;
  organizer_id: string;
  city: string;
  destination: string;
  departure_at: string;
  fishing_method: string;
  target_fish: string;
  transport: string;
  seats: number;
  finance_mode: "free" | "split" | "fee";
  contribution_rub: number;
  cost_details: string;
  description: string;
  status: "open" | "closed";
  trip_kind: "community" | "guided";
  guide_service: string;
  boat_type: string;
  sonar_model: string;
  gear_included: string;
  price_includes: string;
  cancel_policy: string;
  guide_experience_years: number | null;
  platform_commission_bps: number;
  safety_briefing: boolean;
  life_jackets_available: boolean;
  operator_eligibility_confirmed: boolean;
  organizer?: Profile | null;
};
type Application = {
  id: string;
  trip_id: string;
  applicant_id: string;
  note: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  applicant?: Profile | null;
};
type PrivateMessage = { id: string; sender_id: string; body: string; created_at: string };
type View = "discover" | "mine" | "applications";

const lime = "text-lime-300";
const financeLabels = {
  free: "Бесплатно",
  split: "Делим расходы",
  fee: "Фиксированный взнос",
} as const;
const statusLabels = {
  pending: "Ожидает решения",
  accepted: "Место подтверждено",
  declined: "Отклонено",
  withdrawn: "Отклик отозван",
} as const;

function formatDeparture(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

function moneyLabel(trip: Trip) {
  if (trip.finance_mode === "free") return "Бесплатно";
  if (trip.contribution_rub === 0) return trip.finance_mode === "split" ? "Расходы по договорённости" : "Цена по договорённости";
  return `${trip.contribution_rub.toLocaleString("ru-RU")} ₽ / чел.`;
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold text-zinc-300">
      <span>{title}</span>
      {children}
    </label>
  );
}

function Partners() {
  const [userId, setUserId] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [view, setView] = useState<View>("discover");
  const [cityFilter, setCityFilter] = useState("");
  const [financeFilter, setFinanceFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [applyTo, setApplyTo] = useState<string | null>(null);
  const [applicationNote, setApplicationNote] = useState("");
  const [chatRequest, setChatRequest] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<PrivateMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [city, setCity] = useState("Нижний Новгород");
  const [destination, setDestination] = useState("");
  const [departure, setDeparture] = useState("");
  const [method, setMethod] = useState("Спиннинг");
  const [fish, setFish] = useState("");
  const [transport, setTransport] = useState("Обсудим");
  const [seats, setSeats] = useState("1");
  const [financeMode, setFinanceMode] = useState<Trip["finance_mode"]>("free");
  const [amount, setAmount] = useState("");
  const [costDetails, setCostDetails] = useState("");
  const [description, setDescription] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      setUserId(auth.user?.id ?? null);
      const { data, error: tripsError } = await supabase
        .from("partner_trips")
        .select("id,organizer_id,city,destination,departure_at,fishing_method,target_fish,transport,seats,finance_mode,contribution_rub,cost_details,description,status,trip_kind,guide_service,boat_type,sonar_model,gear_included,price_includes,cancel_policy,guide_experience_years,platform_commission_bps,safety_briefing,life_jackets_available,operator_eligibility_confirmed,organizer:profiles!partner_trips_organizer_id_fkey(username,display_name,avatar_url)")
        .order("departure_at", { ascending: true })
        .limit(100);
      if (tripsError) throw tripsError;
      setTrips((data ?? []) as unknown as Trip[]);

      if (auth.user) {
        const { data: requests, error: requestsError } = await supabase
          .from("partner_trip_requests")
          .select("id,trip_id,applicant_id,note,status,applicant:profiles!partner_trip_requests_applicant_id_fkey(username,display_name,avatar_url)")
          .order("created_at", { ascending: false })
          .limit(300);
        if (requestsError) throw requestsError;
        setApplications((requests ?? []) as unknown as Application[]);
      } else {
        setApplications([]);
      }
    } catch (caught) {
      setError("Не получилось загрузить выезды. Возможно, миграция «Напарники» ещё не применена в Supabase. " +
        (caught instanceof Error ? caught.message : ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const requestsByTrip = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of applications) {
      if (request.status === "accepted") {
        counts.set(request.trip_id, (counts.get(request.trip_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [applications]);

  const visibleTrips = useMemo(() => trips.filter((trip) => {
    const futureOpen = trip.status === "open" && new Date(trip.departure_at).getTime() > Date.now();
    if (view === "discover" && (!futureOpen || trip.organizer_id === userId)) return false;
    if (view === "mine" && trip.organizer_id !== userId) return false;
    if (view === "applications" && !applications.some((a) => a.trip_id === trip.id && a.applicant_id === userId)) return false;
    return (
      (!cityFilter.trim() || [trip.city, trip.destination].some((x) => x.toLowerCase().includes(cityFilter.trim().toLowerCase()))) &&
      (financeFilter === "all" || trip.finance_mode === financeFilter) &&
      (kindFilter === "all" || trip.trip_kind === kindFilter) &&
      (methodFilter === "all" || trip.fishing_method === methodFilter)
    );
  }), [trips, view, cityFilter, financeFilter, methodFilter, kindFilter, userId, applications]);

  async function submitTrip(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (working) return;
    if (!userId) { setError("Чтобы создать выезд, войди в аккаунт."); return; }
    const date = new Date(departure);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      setError("Укажи будущие дату и время выезда."); return;
    }
    if (financeMode !== "free" && !costDetails.trim()) {
      setError("Укажи, за что именно платят участники и как будете рассчитываться."); return;
    }
    if (financeMode === "fee" && !Number(amount)) {
      setError("Для фиксированного взноса укажи сумму."); return;
    }
    setWorking(true); setError(""); setNotice("");
    const { error: insertError } = await supabase.from("partner_trips").insert({
      organizer_id: userId,
      city: city.trim(),
      destination: destination.trim(),
      departure_at: date.toISOString(),
      fishing_method: method,
      target_fish: fish.trim(),
      transport,
      seats: Number(seats),
      finance_mode: financeMode,
      contribution_rub: financeMode === "free" ? 0 : Number(amount) || 0,
      cost_details: financeMode === "free" ? "" : costDetails.trim(),
      description: description.trim(),
    });
    setWorking(false);
    if (insertError) { setError("Не удалось создать выезд: " + insertError.message); return; }
    setShowForm(false); setView("mine");
    setDestination(""); setDeparture(""); setDescription(""); setCostDetails(""); setAmount("");
    setNotice("Выезд опубликован. Отклики появятся в разделе «Мои выезды».");
    await loadData();
  }

  async function sendApplication(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!applyTo || !userId || working) return;
    setWorking(true); setError(""); setNotice("");
    const { error: insertError } = await supabase.from("partner_trip_requests").insert({
      trip_id: applyTo, applicant_id: userId, note: applicationNote.trim(),
    });
    setWorking(false);
    if (insertError) { setError("Не получилось отправить отклик: " + insertError.message); return; }
    setApplyTo(null); setApplicationNote("");
    setNotice("Заявка отправлена. Организатор решит, принять ли её. Денежных списаний не было.");
    await loadData();
  }

  async function decide(request: Application, status: "accepted" | "declined" | "withdrawn") {
    if (working) return;
    setWorking(true); setError(""); setNotice("");
    const { error: updateError } = await supabase
      .from("partner_trip_requests")
      .update({ status })
      .eq("id", request.id);
    setWorking(false);
    if (updateError) { setError("Не удалось обновить заявку: " + updateError.message); return; }
    setNotice(status === "accepted" ? "Напарник принят. Личный чат теперь доступен обоим." :
      status === "declined" ? "Отклик отклонён." : "Отклик отозван.");
    await loadData();
  }

  async function closeTrip(tripId: string) {
    if (working) return;
    setWorking(true); setError("");
    const { error: updateError } = await supabase.from("partner_trips").update({ status: "closed" }).eq("id", tripId);
    setWorking(false);
    if (updateError) { setError(updateError.message); return; }
    setNotice("Набор на выезд закрыт.");
    await loadData();
  }

  async function openChat(requestId: string) {
    if (chatRequest === requestId) { setChatRequest(null); return; }
    setChatRequest(requestId); setChatLoading(true); setChatMessages([]);
    await fetchMessages(requestId);
  }

  async function fetchMessages(requestId: string) {
    setChatLoading(true);
    const { data, error: queryError } = await supabase
      .from("partner_trip_messages")
      .select("id,sender_id,body,created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true })
      .limit(100);
    setChatLoading(false);
    if (queryError) { setError("Не удалось открыть личный чат: " + queryError.message); return; }
    setChatMessages((data ?? []) as PrivateMessage[]);
  }

  async function sendChat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId || !chatRequest || !chatDraft.trim() || working) return;
    setWorking(true);
    const { error: sendError } = await supabase.from("partner_trip_messages").insert({
      request_id: chatRequest, sender_id: userId, body: chatDraft.trim(),
    });
    setWorking(false);
    if (sendError) { setError("Сообщение не отправлено: " + sendError.message); return; }
    setChatDraft("");
    await fetchMessages(chatRequest);
  }

  const actionButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-extrabold text-[#10120c] transition hover:bg-lime-200 disabled:opacity-50";
  const ghostButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-lime-300/40 hover:text-white disabled:opacity-50";

  return (
    <Shell>
      <section className="relative overflow-hidden rounded-3xl border border-lime-300/20 bg-[#10140e] px-5 py-8 sm:px-8 sm:py-11">
        <div className="pointer-events-none absolute -right-10 -top-24 size-72 rounded-full bg-lime-300/[0.09] blur-3xl" />
        <div className="relative">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-lime-300">ZAPRUDA / FISHING MATCH</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">Рыбалка лучше <span className={lime}>вместе.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
            Найди напарника на выезд. Смотри, куда и когда собираются, сколько мест в машине
            и сколько стоит участие. Откликайся — организатор решает, кого взять.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className={actionButton} type="button" onClick={() => { setShowForm((v) => !v); setError(""); }}>
              <Plus aria-hidden="true" className="size-4" /> Организовать выезд
            </button>
            <Link to="/guides" className={ghostButton}><Ship className="size-4" /> Выезды с гидом</Link>
            <span className="inline-flex items-center gap-2 text-xs text-zinc-400"><Users aria-hidden="true" className="size-4 text-lime-300" /> Компания вместо одиночной рыбалки</span>
          </div>
        </div>
      </section>

      {showForm && (
        <form onSubmit={submitTrip} className="mt-5 space-y-5 rounded-2xl border border-lime-300/25 bg-[#171b13] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Новый выезд</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Закрыть форму" className={ghostButton}><X className="size-4" /></button>
          </div>
          {!userId && <p className="rounded-xl border border-amber-300/20 p-3 text-sm text-amber-200">Для публикации нужно <Link to="/auth" className="underline">войти в аккаунт</Link>.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field title="Город отправления *"><input className="field" required minLength={2} maxLength={100} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Нижний Новгород" /></Field>
            <Field title="Водоём / район *"><input className="field" required minLength={2} maxLength={150} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ока, Кудьма, Волга…" /></Field>
            <Field title="Дата и время *"><input className="field" required type="datetime-local" value={departure} onChange={(e) => setDeparture(e.target.value)} /></Field>
            <Field title="Свободных мест *"><select className="field" value={seats} onChange={(e) => setSeats(e.target.value)}>{Array.from({ length: 8 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></Field>
            <Field title="Способ ловли"><select className="field" value={method} onChange={(e) => setMethod(e.target.value)}>{["Спиннинг", "Фидер", "Поплавок", "Зимняя рыбалка", "Нахлыст", "Подводная охота", "Другое"].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field title="Кого ловим"><input className="field" maxLength={100} value={fish} onChange={(e) => setFish(e.target.value)} placeholder="Щука, судак, окунь…" /></Field>
            <Field title="Транспорт"><select className="field" value={transport} onChange={(e) => setTransport(e.target.value)}>{["Есть машина", "Нужна машина", "Своим ходом", "Обсудим"].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field title="Финансовые условия"><select className="field" value={financeMode} onChange={(e) => setFinanceMode(e.target.value as Trip["finance_mode"])}><option value="free">Бесплатно</option><option value="split">Делим расходы</option><option value="fee">Фиксированный взнос</option></select></Field>
            {financeMode !== "free" && (
              <>
                <Field title={financeMode === "fee" ? "Взнос с человека, ₽ *" : "Ориентировочно с человека, ₽"}>
                  <input className="field" type="number" min={financeMode === "fee" ? 1 : 0} max={500000} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Например, 500" />
                </Field>
                <Field title="За что платим и как рассчитываемся *"><input className="field" required maxLength={500} value={costDetails} onChange={(e) => setCostDetails(e.target.value)} placeholder="Бензин пополам, лодка, трансфер…" /></Field>
              </>
            )}
          </div>
          <Field title="Описание выезда"><textarea className="field min-h-28" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="План, время возвращения, необходимое снаряжение, кого ищешь…" /></Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-xs leading-5 text-zinc-400">
              Публикуй только общий район, а точное место встречи сообщи в личном чате после подтверждения.
              Оплата организуется между людьми — ZAPRUDA не принимает и не переводит деньги.
            </p>
            <button className={actionButton} type="submit" disabled={working || !userId}>{working ? "Сохраняем…" : "Опубликовать выезд"}</button>
          </div>
        </form>
      )}

      <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label="Разделы поиска напарников">
        {([["discover", "Найти выезд"], ["mine", "Мои выезды"], ["applications", "Мои отклики"]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${view === id ? "bg-lime-300 text-[#10120c]" : "border border-white/10 bg-white/[0.025] text-zinc-400 hover:text-white"}`}>{label}</button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#151812] p-3">
        <SlidersHorizontal className="ml-1 size-4 text-lime-300" aria-hidden="true" />
        <input className="field min-w-0 flex-1 sm:max-w-56" aria-label="Поиск по городу и водоёму" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="Город или водоём…" />
        <select className="field w-full sm:w-auto" aria-label="Формат выезда" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
          <option value="all">Все выезды</option>
          <option value="community">Напарники</option>
          <option value="guided">Платный гид</option>
        </select>
        <select className="field w-full sm:w-auto" aria-label="Способ ловли" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
          <option value="all">Любая рыбалка</option>
          {["Спиннинг", "Фидер", "Поплавок", "Зимняя рыбалка", "Нахлыст", "Другое"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="field w-full sm:w-auto" aria-label="Условия оплаты" value={financeFilter} onChange={(e) => setFinanceFilter(e.target.value)}>
          <option value="all">Любые условия</option>
          <option value="free">Бесплатно</option>
          <option value="split">Делим расходы</option>
          <option value="fee">Фиксированный взнос</option>
        </select>
        <button type="button" className={ghostButton} onClick={() => void loadData()} aria-label="Обновить список"><RefreshCw className="size-4" /></button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-lime-300/25 bg-lime-300/5 p-4 text-sm text-lime-200">{notice}</p>}
      {loading && <p className="mt-6 rounded-2xl border border-white/10 p-6 text-zinc-400">Загружаем выезды…</p>}
      {!loading && !error && visibleTrips.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-lime-300/25 bg-[#151812] p-10 text-center">
          <Fish className="mx-auto size-11 text-lime-300" strokeWidth={1.4} />
          <h2 className="mt-4 text-xl font-bold">{view === "discover" ? "Пока нет подходящих выездов" : view === "mine" ? "У тебя пока нет выездов" : "Откликов пока нет"}</h2>
          <p className="mt-2 text-sm text-zinc-400">Попробуй изменить фильтры или создай первый совместный выезд.</p>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {!loading && visibleTrips.map((trip) => {
          const myRequest = applications.find((r) => r.trip_id === trip.id && r.applicant_id === userId);
          const own = trip.organizer_id === userId;
          const approved = requestsByTrip.get(trip.id) ?? 0;
          const remaining = Math.max(0, trip.seats - approved);
          const applicants = own ? applications.filter((r) => r.trip_id === trip.id) : [];
          const displayName = trip.organizer?.display_name || trip.organizer?.username || "Рыболов ZAPRUDA";
          const outOfDate = trip.status !== "open" || new Date(trip.departure_at) <= new Date();
          return (
            <article key={trip.id} className="self-start overflow-hidden rounded-2xl border border-white/10 bg-[#171a15]">
              <div className="relative border-b border-white/10 bg-gradient-to-br from-[#27321b] via-[#171d13] to-[#151811] px-5 pb-5 pt-6">
                <div className="mb-5 flex items-center gap-3">
                  {trip.organizer?.avatar_url
                    ? <img alt="" className="size-12 rounded-full border border-lime-300/30 object-cover" src={trip.organizer.avatar_url} />
                    : <div className="flex size-12 items-center justify-center rounded-full border border-lime-300/30 bg-lime-300/10 text-lg font-black text-lime-300">{displayName[0]?.toUpperCase()}</div>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{displayName}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{trip.trip_kind === "guided" ? "Рыболовный гид · данные со слов организатора" : "Организатор выезда"}</p>
                  </div>
                  <span className="rounded-full border border-lime-300/25 bg-lime-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-lime-300">{trip.trip_kind === "guided" ? "ПЛАТНЫЙ ГИД" : own ? "Мой выезд" : outOfDate ? "Завершён" : "Набор открыт"}</span>
                </div>
                <h2 className="text-xl font-extrabold text-white">{trip.destination}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400"><MapPin className="size-3.5" aria-hidden="true" /> {trip.city}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5"><CalendarDays className="size-3.5 text-lime-300" aria-hidden="true" />{formatDeparture(trip.departure_at)}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5"><Users className="size-3.5 text-lime-300" aria-hidden="true" />{own ? `${remaining} из ${trip.seats} мест` : `До ${trip.seats} мест · уточни наличие`}</span>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-zinc-500">Рыбалка</p><p className="mt-1 font-bold text-zinc-200"><Fish className="mr-1 inline size-3.5 text-lime-300" />{trip.fishing_method}{trip.target_fish ? ` · ${trip.target_fish}` : ""}</p></div>
                  <div><p className="text-zinc-500">Транспорт</p><p className="mt-1 font-bold text-zinc-200"><CarFront className="mr-1 inline size-3.5 text-lime-300" />{trip.transport}</p></div>
                  <div className="col-span-2 rounded-xl border border-lime-300/20 bg-lime-300/[0.045] px-3 py-3">
                    <p className="text-zinc-400"><CircleDollarSign className="mr-1 inline size-4 text-lime-300" />{trip.trip_kind === "guided" ? "Стоимость платной рыбалки" : financeLabels[trip.finance_mode]}</p>
                    <p className="mt-1 text-base font-extrabold text-lime-300">{moneyLabel(trip)}</p>
                    {trip.cost_details && <p className="mt-1 text-xs leading-5 text-zinc-300">{trip.cost_details}</p>}
                  </div>
                </div>
                {trip.trip_kind === "guided" && (
                  <section className="rounded-xl border border-lime-300/20 bg-black/20 p-3 text-xs leading-6 text-zinc-300">
                    <p className="font-black uppercase tracking-wider text-lime-300"><Ship className="mr-1 inline size-4" /> Гид на лодке</p>
                    <p className="mt-2"><b className="text-white">Программа:</b> {trip.guide_service}</p>
                    <p><b className="text-white">Лодка:</b> {trip.boat_type}</p>
                    {trip.sonar_model && <p><b className="text-white">Эхолот:</b> {trip.sonar_model}</p>}
                    {trip.gear_included && <p><b className="text-white">Снасти:</b> {trip.gear_included}</p>}
                    <p><b className="text-white">В цену входит:</b> {trip.price_includes}</p>
                    <p><b className="text-white">Условия отмены:</b> {trip.cancel_policy}</p>
                    <p className="mt-2 border-t border-white/10 pt-2 text-zinc-400"><ShieldAlert className="mr-1 inline size-4 text-lime-300"/>Инструктаж и жилеты подтверждены гидом самостоятельно. Квалификация не проверена.</p>
                    <p className="mt-1 text-zinc-500">Заявка не является оплатой. Комиссия платформы {trip.platform_commission_bps / 100}% будет применяться только при подключённом эквайринге и оплате.</p>
                  </section>
                )}
                {trip.description && <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{trip.description}</p>}
                {own && (
                  <div className="space-y-3 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">Заявки · {applicants.length}</p>
                      {!outOfDate && <button className={ghostButton} disabled={working} onClick={() => void closeTrip(trip.id)}>Закрыть набор</button>}
                    </div>
                    {applicants.length === 0 && <p className="text-xs text-zinc-500">Пока никто не откликнулся.</p>}
                    {applicants.map((application) => (
                      <div key={application.id} className="space-y-2 rounded-xl border border-white/10 p-3">
                        <p className="text-sm font-bold">{application.applicant?.display_name || application.applicant?.username || "Рыболов"}</p>
                        {application.note && <p className="whitespace-pre-wrap text-xs text-zinc-400">{application.note}</p>}
                        <p className="text-xs text-lime-300">{statusLabels[application.status]}</p>
                        <div className="flex flex-wrap gap-2">
                          {application.status === "pending" && !outOfDate && (
                            <>
                              <button className={ghostButton} disabled={working || remaining === 0} onClick={() => void decide(application, "accepted")}><Check className="size-3.5" />Принять</button>
                              <button className={ghostButton} disabled={working} onClick={() => void decide(application, "declined")}><X className="size-3.5" />Отклонить</button>
                            </>
                          )}
                          {application.status === "accepted" && (
                            <button className={ghostButton} onClick={() => void openChat(application.id)}><MessageCircle className="size-3.5" />Личный чат</button>
                          )}
                        </div>
                        {chatRequest === application.id && chatPanel(application.id)}
                      </div>
                    ))}
                  </div>
                )}
                {!own && (
                  <div className="space-y-3 border-t border-white/10 pt-4">
                    {myRequest ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-bold text-lime-300">{statusLabels[myRequest.status]}</span>
                        {myRequest.status === "pending" && <button className={ghostButton} disabled={working} onClick={() => void decide(myRequest, "withdrawn")}>Отозвать</button>}
                        {myRequest.status === "accepted" && <button className={ghostButton} onClick={() => void openChat(myRequest.id)}><MessageCircle className="size-4" />Личный чат</button>}
                      </div>
                    ) : outOfDate || (own && remaining === 0) ? (
                      <p className="text-xs text-zinc-400">{remaining === 0 ? "Свободных мест не осталось" : "Приём заявок завершён"}</p>
                    ) : userId ? (
                      <button className={actionButton + " w-full"} type="button" onClick={() => { setApplyTo(trip.id); setApplicationNote(""); }}>
                        Откликнуться <ArrowRight className="size-4" />
                      </button>
                    ) : (
                      <Link to="/auth" className={actionButton + " w-full"}>Войди, чтобы откликнуться <ArrowRight className="size-4" /></Link>
                    )}
                    {myRequest?.status === "accepted" && chatRequest === myRequest.id && chatPanel(myRequest.id)}
                    {applyTo === trip.id && (
                      <form onSubmit={sendApplication} className="space-y-3 rounded-xl border border-lime-300/25 bg-lime-300/[0.04] p-3">
                        <p className="text-sm font-bold">{trip.trip_kind === "guided" ? "Заявка на платный выезд с гидом" : "Отклик на выезд"}</p>
                        {trip.trip_kind === "guided" && <p className="text-xs text-lime-300">Стоимость: {moneyLabel(trip)}. Подача заявки бесплатна, онлайн-оплата пока не подключена.</p>}
                        <textarea className="field min-h-24 text-sm" maxLength={500} placeholder="Расскажи о себе и почему хочешь поехать (необязательно)" value={applicationNote} onChange={(e) => setApplicationNote(e.target.value)} />
                        <p className="text-xs text-zinc-400">Отправка отклика не означает, что место уже подтверждено.</p>
                        <div className="flex gap-2">
                          <button type="submit" className={actionButton} disabled={working}>{working ? "Отправляем…" : "Отправить заявку"}</button>
                          <button type="button" className={ghostButton} onClick={() => setApplyTo(null)}>Отмена</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-7 flex items-start gap-3 rounded-xl border border-white/10 bg-[#151812] p-4 text-sm text-zinc-400">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-lime-300" aria-hidden="true" />
        <p>
          Договаривайтесь о расходах заранее. Платежи и переводы проходят вне ZAPRUDA — приложение
          не является гарантом сделки. Для первой встречи выбирайте общественное место.
        </p>
      </div>
    </Shell>
  );

  function chatPanel(requestId: string) {
    return (
      <div className="mt-3 space-y-2 rounded-xl border border-lime-300/20 bg-black/25 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-lime-300">Личный чат по выезду</p>
          <button type="button" onClick={() => void fetchMessages(requestId)} className="text-xs text-zinc-400 hover:text-white"><RefreshCw className="size-4" aria-label="Обновить сообщения" /></button>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {chatLoading && <p className="text-xs text-zinc-400">Загрузка…</p>}
          {!chatLoading && !chatMessages.length && <p className="text-xs text-zinc-500">Пока сообщений нет. Поздоровайся!</p>}
          {chatMessages.map((message) => (
            <div key={message.id} className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-5 ${message.sender_id === userId ? "ml-auto bg-lime-300/15 text-lime-100" : "bg-white/[0.07] text-zinc-200"}`}>
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <p className="mt-1 text-[10px] text-zinc-500"><Clock3 className="mr-1 inline size-2.5" />{new Date(message.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          ))}
        </div>
        <form onSubmit={sendChat} className="flex gap-2">
          <input className="field min-w-0 flex-1 text-xs" maxLength={2000} value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} placeholder="Договоритесь о встрече…" />
          <button className={actionButton} type="submit" disabled={working || !chatDraft.trim()} aria-label="Отправить сообщение"><Send className="size-4" /></button>
        </form>
      </div>
    );
  }
}
