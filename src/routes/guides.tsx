import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Anchor, CalendarDays, Check, CircleDollarSign, Compass, Fish, MapPin,
  Plus, Save, ShieldAlert, ShieldCheck, Ship, Users, Waves,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { GuideVerification } from "@/components/GuideVerification";
import { GuideBookingInbox } from "@/components/GuideBookings";
import { InteractiveFishingMap } from "@/components/InteractiveFishingMap";

export const Route = createFileRoute("/guides")({
  head: () => ({ meta: [
    { title: "Кабинет рыболовного гида — ZAPRUDA" },
    { name: "description", content: "Анкета гида, лодка и эхолот, платные выезды и заявки клиентов." },
  ] }),
  component: GuideCabinet,
});

type Guide = {
  user_id: string;
  service_mode: "shore" | "boat" | "both";
  meeting_area: string;
  meeting_lat: number | null;
  meeting_lon: number | null;
  title: string;
  home_city: string;
  about: string;
  specialties: string;
  experience_years: number | null;
  boat_model: string;
  boat_capacity: number | null;
  sonar_model: string;
  live_sonar_system: string;
  live_sonar_model: string;
  included_gear: string;
  service_program: string;
  cancellation_terms: string;
  offers_safety_briefing: boolean;
  offers_life_jackets: boolean;
  eligibility_self_attested: boolean;
  is_active: boolean;
};
type GuidedTrip = {
  id: string;
  city: string;
  destination: string;
  departure_at: string;
  contribution_rub: number;
  seats: number;
  status: "open" | "closed";
};
type Quote = {
  request_id: string;
  fixed_price_rub: number;
  estimated_commission_rub: number;
  estimated_guide_net_rub: number;
  payment_status: string;
  created_at: string;
};
type ProfileField = Exclude<keyof Guide, "user_id">;

const EMPTY_GUIDE: Omit<Guide, "user_id"> = {
  title: "",
  service_mode: "shore",
  meeting_area: "",
  meeting_lat: null,
  meeting_lon: null,
  home_city: "",
  about: "",
  specialties: "Спиннинг",
  experience_years: null,
  boat_model: "",
  boat_capacity: 2,
  sonar_model: "",
  live_sonar_system: "Нет",
  live_sonar_model: "",
  included_gear: "",
  service_program: "Инструктаж по лодке, работа с эхолотом и поиск перспективных мест",
  cancellation_terms: "Условия отмены и переноса согласуем до подтверждения выезда.",
  offers_safety_briefing: false,
  offers_life_jackets: false,
  eligibility_self_attested: false,
  is_active: false,
};

function Label({ title, children }: { title: string; children: ReactNode }) {
  return <label className="block space-y-1.5">
    <span className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">{title}</span>
    {children}
  </label>;
}

const formatMoney = (v: number) => v.toLocaleString("ru-RU") + " ₽";

function GuideCabinet() {
  const [userId, setUserId] = useState<string | null>(null);
  const [guide, setGuide] = useState<Omit<Guide, "user_id">>(EMPTY_GUIDE);
  const [hasGuide, setHasGuide] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [trips, setTrips] = useState<GuidedTrip[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openNewTrip, setOpenNewTrip] = useState(false);
  const [destination, setDestination] = useState("");
  const [departure, setDeparture] = useState("");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState("2");
  const [fish, setFish] = useState("");
  const [method, setMethod] = useState("Спиннинг");
  const [tripMode, setTripMode] = useState<"shore"|"boat">("shore");
  const [duration, setDuration] = useState("6");
  const [details, setDetails] = useState("");

  function update<K extends ProfileField>(key: K, value: Guide[K]) {
    setGuide((old) => ({ ...old, [key]: value }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) {
      setUserId(null);
      setError("Войди в ZAPRUDA, чтобы открыть кабинет гида.");
      setLoading(false);
      return;
    }
    const id = data.user.id;
    setUserId(id);
    const [guideResult, tripResult, quoteResult] = await Promise.all([
      supabase.from("guide_profiles").select("*").eq("user_id", id).maybeSingle(),
      supabase.from("partner_trips").select("id,city,destination,departure_at,contribution_rub,seats,status")
        .eq("organizer_id", id).eq("trip_kind", "guided").order("departure_at", { ascending: false }).limit(100),
      supabase.from("guide_booking_quotes").select(
        "request_id,fixed_price_rub,estimated_commission_rub,estimated_guide_net_rub,payment_status,created_at"
      ).eq("guide_id", id).order("created_at", { ascending: false }).limit(100),
    ]);
    if (guideResult.error || tripResult.error || quoteResult.error) {
      setError("Ошибка загрузки кабинета: " +
        (guideResult.error?.message || tripResult.error?.message || quoteResult.error?.message));
    } else {
      setHasGuide(Boolean(guideResult.data));
      if (guideResult.data) setGuide({
        title: guideResult.data.title,
        service_mode: (guideResult.data.service_mode || "boat") as "shore"|"boat"|"both",
        meeting_area: guideResult.data.meeting_area || "",
        meeting_lat: guideResult.data.meeting_lat === null ? null : Number(guideResult.data.meeting_lat),
        meeting_lon: guideResult.data.meeting_lon === null ? null : Number(guideResult.data.meeting_lon),
        home_city: guideResult.data.home_city,
        about: guideResult.data.about,
        specialties: guideResult.data.specialties,
        experience_years: guideResult.data.experience_years,
        boat_model: guideResult.data.boat_model,
        boat_capacity: guideResult.data.boat_capacity,
        sonar_model: guideResult.data.sonar_model,
        live_sonar_system: guideResult.data.live_sonar_system,
        live_sonar_model: guideResult.data.live_sonar_model,
        included_gear: guideResult.data.included_gear,
        service_program: guideResult.data.service_program,
        cancellation_terms: guideResult.data.cancellation_terms,
        offers_safety_briefing: guideResult.data.offers_safety_briefing,
        offers_life_jackets: guideResult.data.offers_life_jackets,
        eligibility_self_attested: guideResult.data.eligibility_self_attested,
        is_active: guideResult.data.is_active,
      });
      setTrips((tripResult.data ?? []) as GuidedTrip[]);
      setQuotes((quoteResult.data ?? []) as Quote[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isReady = Boolean(
    guide.title.trim().length >= 2 && guide.home_city.trim().length >= 2 &&
    (guide.service_mode === "shore" || guide.boat_model.trim().length >= 2) &&
    guide.service_program.trim().length >= 5 &&
    guide.cancellation_terms.trim().length >= 5 &&
    (guide.service_mode === "shore" || guide.offers_life_jackets) && guide.offers_safety_briefing &&
    guide.eligibility_self_attested
  );

  async function saveGuide(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId || working) return;
    if ((guide.meeting_lat===null)!==(guide.meeting_lon===null)){
      setError("Укажи обе координаты места встречи или оставь обе пустыми.");
      return;
    }
    if (guide.is_active && !isReady) {
      setError("Заполни программу и безопасность. Лодка и спасжилеты обязательны только для лодочного гида.");
      return;
    }
    setWorking(true);
    setNotice("");
    setError("");
    const { error: saveError } = await supabase.from("guide_profiles").upsert({
      user_id: userId,
      ...guide,
      title: guide.title.trim(),
      home_city: guide.home_city.trim(),
      boat_model: guide.boat_model.trim(),
      about: guide.about.trim(),
      specialties: guide.specialties.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setWorking(false);
    if (saveError) { setError("Не удалось сохранить анкету: " + saveError.message); return; }
    setHasGuide(true);
    setTripMode(guide.service_mode === "boat" ? "boat" : "shore");
    setNotice("Анкета гида сохранена. Это самозаявленные сведения, а не подтверждение квалификации.");
  }

  async function publish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId || !hasGuide || !guide.is_active || !isReady || !isVerified || working) {
      setError("Коммерческие выезды доступны только после подтверждения документов администратором ZAPRUDA.");
      return;
    }
    const date = new Date(departure);
    const totalPrice = Number(price);
    if (guide.service_mode !== "both" && guide.service_mode !== tripMode) {
      setError("Этот вид выезда не поддерживается твоей анкетой.");
      return;
    }
    if (isNaN(date.getTime()) || date.getTime() <= Date.now() || !Number.isInteger(totalPrice) || totalPrice < 1) {
      setError("Укажи дату в будущем и стоимость за человека в целых рублях.");
      return;
    }
    setWorking(true);
    setError("");
    setNotice("");
    const { error: publishError } = await supabase.from("partner_trips").insert({
      organizer_id: userId,
      trip_kind: "guided",
      city: guide.home_city.trim(),
      destination: destination.trim(),
      departure_at: date.toISOString(),
      fishing_method: method,
      target_fish: fish.trim(),
      transport: tripMode === "boat" ? "Лодка гида" : "Пешком, берег",
      boat_trip: tripMode === "boat",
      seats: Number(seats),
      duration_hours: Number(duration),
      finance_mode: "fee",
      contribution_rub: totalPrice,
      cost_details: details.trim() || "Стоимость указана за одного участника",
      description: guide.about.trim(),
      guide_service: guide.service_program.trim(),
      boat_type: tripMode === "boat" ? guide.boat_model.trim() : "",
      sonar_model: tripMode === "boat" ? guide.sonar_model.trim() : "",
      live_sonar_system: tripMode === "boat" ? guide.live_sonar_system : "Нет",
      live_sonar_model: guide.live_sonar_system === "Нет" ? "" : guide.live_sonar_model.trim(),
      gear_included: guide.included_gear.trim(),
      price_includes: details.trim() || guide.service_program.trim(),
      cancel_policy: guide.cancellation_terms.trim(),
      guide_experience_years: guide.experience_years,
      safety_briefing: guide.offers_safety_briefing,
      life_jackets_available: tripMode === "boat" ? guide.offers_life_jackets : false,
      operator_eligibility_confirmed: guide.eligibility_self_attested,
    });
    setWorking(false);
    if (publishError) { setError("Не удалось опубликовать выезд: " + publishError.message); return; }
    setOpenNewTrip(false);
    setDestination(""); setDeparture(""); setPrice(""); setDetails("");
    setNotice("Платный выезд опубликован. Цена и комиссия 10% сохранены и больше не изменяются.");
    await load();
  }

  async function closeTrip(id: string) {
    if (!userId || working) return;
    setWorking(true);
    setError("");
    const { error: closeError } = await supabase.from("partner_trips")
      .update({ status: "closed" }).eq("id", id).eq("organizer_id", userId);
    setWorking(false);
    if (closeError) setError(closeError.message);
    else { setNotice("Набор на выезд закрыт."); await load(); }
  }

  return <Shell>
    <section className="relative overflow-hidden rounded-3xl border border-[#D7FF35]/25 bg-gradient-to-br from-[#243219] via-[#171F13] to-[#10140F] p-6 sm:p-9">
      <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-[#D7FF35]/10 blur-3xl" />
      <p className="relative text-xs font-black uppercase tracking-[0.2em] text-[#D7FF35]">ZAPRUDA / GUIDE PRO</p>
      <h1 className="relative mt-3 text-2xl font-black text-white sm:text-4xl">Кабинет рыболовного гида</h1>
      <p className="relative mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
        Управляй анкетой, лодкой, эхолотом и коммерческими выездами. Комиссия ZAPRUDA — 10% только
        с оплаченных бронирований. Пока онлайн-оплата отключена, комиссия не взимается.
      </p>
      <div className="relative mt-5 flex flex-wrap gap-3">
        <Link to="/partners" className="btn-ghost inline-flex"> <Compass className="size-4" /> Смотреть все выезды</Link>
        <span className="inline-flex items-center gap-2 rounded-xl border border-[#D7FF35]/30 bg-[#D7FF35]/10 px-3 py-2 text-xs font-bold text-[#D7FF35]">
          <ShieldAlert className="size-4" /> Для платных выездов нужна проверка администратора
        </span>
      </div>
    </section>

    {loading && <p className="panel mt-5 p-5 text-sm text-zinc-400">Загружаем кабинет…</p>}
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl border border-[#D7FF35]/25 bg-[#D7FF35]/10 p-4 text-sm text-[#D7FF35]"><Check className="mr-2 inline size-4" />{notice}</p>}

    {!loading && !userId && <div className="panel mt-6 p-8 text-center">
      <p className="font-bold">Для создания анкеты гида войди в аккаунт.</p>
      <Link search={{ mode: "in" }} to="/auth" className="btn-primary mt-4">Войти</Link>
    </div>}

    {!loading && userId && <>
      <section className="mt-6 rounded-3xl border border-white/10 bg-[#151915] p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D7FF35]">01 / Данные инструктора</p>
            <h2 className="mt-2 text-xl font-black">Мой профиль гида</h2>
          </div>
          <span className="rounded-lg border border-[#D7FF35]/20 bg-[#D7FF35]/5 px-3 py-2 text-xs text-zinc-300">
            {isVerified ? "✓ Проверенный гид" : guide.is_active ? "Активная анкета · заявка требует проверки" : "Черновик / не опубликован"}
          </span>
        </div>
        <form onSubmit={saveGuide} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Label title="Формат гида">
              <select className="field" value={guide.service_mode} onChange={e=>{const m=e.target.value as "shore"|"boat"|"both";update("service_mode",m);setTripMode(m==="boat"?"boat":"shore");}}>
                <option value="shore">Береговой гид</option>
                <option value="boat">Лодочный гид</option>
                <option value="both">Берег и лодка</option>
              </select>
            </Label>
            <Label title="Район работы / место встречи">
              <input className="field" maxLength={160} value={guide.meeting_area}
                 onChange={e=>update("meeting_area",e.target.value)} placeholder="Например, Ока — Мызинский мост, Нижний Новгород" />
            </Label>
            <Label title="Широта точки встречи (Яндекс Карты)">
              <input type="number" step="0.000001" min={-90} max={90} className="field"
                value={guide.meeting_lat ?? ""} onChange={e=>update("meeting_lat",e.target.value?Number(e.target.value):null)}
                placeholder="56.247551" />
            </Label>
            <Label title="Долгота точки встречи (Яндекс Карты)">
              <input type="number" step="0.000001" min={-180} max={180} className="field"
                value={guide.meeting_lon ?? ""} onChange={e=>update("meeting_lon",e.target.value?Number(e.target.value):null)}
                placeholder="43.949333" />
            </Label>
            <Label title="Имя гида или название услуги"><input className="field" value={guide.title} maxLength={100} onChange={(e) => update("title",e.target.value)} placeholder="Например, Иван — рыболовный гид" required /></Label>
            <Label title="Город и регион работы"><input className="field" value={guide.home_city} maxLength={100} onChange={(e) => update("home_city",e.target.value)} placeholder="Нижний Новгород" required /></Label>
            <Label title="Стаж работы с рыбалкой, лет"><input className="field" type="number" min={0} max={60} value={guide.experience_years ?? ""} onChange={(e)=>update("experience_years",e.target.value?Number(e.target.value):null)} /></Label>
            <Label title="Какая рыбалка"><input className="field" value={guide.specialties} maxLength={400} onChange={(e)=>update("specialties",e.target.value)} placeholder="Судак, спиннинг, джиг" /></Label>
            {guide.service_mode !== "shore" && <>
            <Label title="Лодка / модель"><input className="field" required maxLength={180} value={guide.boat_model} onChange={(e)=>update("boat_model",e.target.value)} placeholder="Например, Волжанка 46" /></Label>
            <Label title="Пассажиров на борту"><input className="field" type="number" min={1} max={12} value={guide.boat_capacity ?? ""} onChange={(e)=>update("boat_capacity",e.target.value?Number(e.target.value):null)} /></Label>
            <Label title="Основной эхолот / модель"><input className="field" value={guide.sonar_model} maxLength={180} onChange={(e)=>update("sonar_model",e.target.value)} placeholder="Garmin, Lowrance, Humminbird…" /></Label>
            <Label title="Система живого сканирования (Panoptix)"><select className="field" value={guide.live_sonar_system} onChange={(e)=>update("live_sonar_system",e.target.value)}>
              {["Нет","Garmin Panoptix","Garmin LiveScope","Другая система"].map((name)=><option key={name}>{name}</option>)}
            </select></Label>
            {guide.live_sonar_system !== "Нет" && <Label title="Модель Panoptix / LiveScope">
              <input className="field" list="guide-live-sonar-models" value={guide.live_sonar_model} maxLength={180}
                onChange={(e)=>update("live_sonar_model",e.target.value)} placeholder="Например, LVS34 или PS22"/>
              <datalist id="guide-live-sonar-models">
                {["PS22","PS30","PS51","PS70","LVS32","LVS34","LVS42","Другая модель"].map((name)=><option key={name} value={name}/>)}
              </datalist>
            </Label>}
            </>}
            <Label title="Что входит из снастей"><input className="field" value={guide.included_gear} maxLength={500} onChange={(e)=>update("included_gear",e.target.value)} placeholder="Спиннинги, приманки, жилеты…" /></Label>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#D7FF35]">Место встречи · Яндекс Карты</p>
            <InteractiveFishingMap
              homeCity={guide.home_city} homeRegion=""
              marks={[]}
              selected={guide.meeting_lat!==null&&guide.meeting_lon!==null?
                {latitude:guide.meeting_lat,longitude:guide.meeting_lon}:null}
              onPick={point=>{update("meeting_lat",point.latitude);update("meeting_lon",point.longitude);}}
              onSelectMark={()=>{}}
            />
            <p className="mt-2 text-xs text-zinc-400">Координаты точки встречи используются в публичной карточке проверенного гида. Не отмечай здесь свои секретные рыболовные места.</p>
          </div>
                    <Label title="О гиде"><textarea className="field min-h-24" value={guide.about} maxLength={1500} onChange={(e)=>update("about",e.target.value)} placeholder="Какие водоёмы знаешь, как проходит выезд…" /></Label>
          <Label title="Программа: чему научишь"><textarea className="field min-h-24" required value={guide.service_program} maxLength={700} onChange={(e)=>update("service_program",e.target.value)} /></Label>
          <Label title="Отмена / перенос / погода"><textarea className="field min-h-20" required value={guide.cancellation_terms} maxLength={500} onChange={(e)=>update("cancellation_terms",e.target.value)} /></Label>
          <div className="space-y-3 rounded-xl border border-white/10 bg-black/15 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-4 text-[#D7FF35]" /> Безопасность на воде</h3>
            {([
              ["offers_safety_briefing","Провожу инструктаж перед посадкой"],
              ["offers_life_jackets","Обеспечиваю спасательные жилеты для всех участников"],
              ["eligibility_self_attested","Подтверждаю соблюдение применимых требований к лодке и управлению"],
            ] as const).map(([key,label]) => (
              <label key={key} className="flex items-start gap-3 text-sm text-zinc-300">
                <input type="checkbox" className="mt-1 accent-lime-300" checked={guide[key]} onChange={(e)=>update(key,e.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
            <p className="text-xs text-zinc-500">Лодка и спасжилеты обязательны только для лодочного гида. Документы и квалификацию проверяет администратор ZAPRUDA отдельно.</p>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-[#D7FF35]/20 bg-[#D7FF35]/5 p-4 text-sm font-bold">
            <input type="checkbox" className="accent-lime-300" checked={guide.is_active} onChange={(e)=>update("is_active",e.target.checked)} />
            <span>Показывать анкету и разрешить публикацию платных выездов</span>
          </label>
          <button className="btn-primary" type="submit" disabled={working}><Save className="size-4"/>{working?"Сохраняем…":"Сохранить профиль гида"}</button>
        </form>
      </section>

      <GuideVerification userId={userId} guideSaved={hasGuide} onVerificationChange={setIsVerified} />
      <GuideBookingInbox />

      <section className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#D7FF35]">02 / Мои услуги</p>
            <h2 className="mt-2 text-xl font-black">Платные выезды</h2></div>
          <button type="button" className="btn-primary" disabled={!hasGuide || !guide.is_active || !isReady || !isVerified}
            onClick={()=>setOpenNewTrip((v)=>!v)}><Plus className="size-4"/> Новый выезд</button>
        </div>
        {(!hasGuide || !guide.is_active || !isReady || !isVerified) && <p className="rounded-xl border border-[#D7FF35]/20 p-4 text-sm text-zinc-400">Платные выезды доступны после сохранения анкеты, подтверждения мер безопасности и верификации документов администратором. Данные о Panoptix и LiveScope пока заявляются самим гидом и отдельно должны сверяться при проверке.</p>}
        {openNewTrip && <form onSubmit={publish} className="space-y-4 rounded-2xl border border-[#D7FF35]/30 bg-[#151B11] p-5 sm:p-6">
          <p className="text-sm font-bold text-[#D7FF35]">Новый платный выезд с гидом</p>
          <label className="block text-xs font-bold text-zinc-300">Формат выезда
            <select className="field mt-1 w-full" value={tripMode} onChange={e=>setTripMode(e.target.value as "shore"|"boat")}>
              {guide.service_mode !== "boat" && <option value="shore">Рыбалка с берега</option>}
              {guide.service_mode !== "shore" && <option value="boat">Рыбалка с лодки</option>}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Label title="Водоём / район"><input className="field" value={destination} required maxLength={150} onChange={(e)=>setDestination(e.target.value)} placeholder="Волга, Кудьма…" /></Label>
            <Label title="Дата и время"><input className="field" type="datetime-local" required value={departure} onChange={(e)=>setDeparture(e.target.value)} /></Label>
            <Label title="Стоимость за человека, ₽"><input className="field" type="number" min={1} max={500000} required value={price} onChange={(e)=>setPrice(e.target.value)} /></Label>
            <Label title="Мест для клиентов"><select className="field" value={seats} onChange={(e)=>setSeats(e.target.value)}>
              {Array.from({length:Math.min(8,guide.boat_capacity??2)},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
            </select></Label>
            <Label title="Продолжительность, часов"><input className="field" type="number" min={1} max={72} value={duration} onChange={(e)=>setDuration(e.target.value)} required /></Label>
            <Label title="Способ ловли"><select className="field" value={method} onChange={(e)=>setMethod(e.target.value)}>
              {["Спиннинг","Фидер","Поплавок","Нахлыст","Зимняя рыбалка","Карпфишинг","Донная ловля"].map((v)=><option key={v}>{v}</option>)}
            </select></Label>
            <Label title="Целевая рыба"><input className="field" value={fish} maxLength={100} onChange={(e)=>setFish(e.target.value)} placeholder="Судак, щука…" /></Label>
            <Label title="Что включено в цену"><textarea className="field min-h-20" required maxLength={650} value={details} onChange={(e)=>setDetails(e.target.value)} placeholder="Лодка, топливо, эхолот, обучение; дополнительные расходы…" /></Label>
          </div>
          {price && Number(price)>0 && <div className="rounded-xl border border-[#D7FF35]/25 bg-[#D7FF35]/10 p-4 text-sm">
            <p className="font-bold text-[#D7FF35]">{formatMoney(Number(price))} / участник</p>
            <p className="mt-1 text-zinc-300">Будущая комиссия 10%: {formatMoney(Math.round(Number(price)*.1))}; гиду после неё: {formatMoney(Number(price)-Math.round(Number(price)*.1))}.</p>
            <p className="mt-1 text-xs text-zinc-400">Расчёт для будущей подтверждённой оплаты, не настоящее списание.</p>
          </div>}
          <p className="text-xs leading-5 text-zinc-400">Цена, её состав, условия отмены и ставка комиссии фиксируются при публикации. Для изменения стоимости закрой объявление и создай новое.</p>
          <button type="submit" className="btn-primary" disabled={working}>{working?"Публикуем…":"Опубликовать платный выезд"}</button>
        </form>}
        <div className="grid gap-3 sm:grid-cols-2">
          {trips.map((trip)=><article key={trip.id} className="rounded-2xl border border-white/10 bg-[#171B16] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#D7FF35]">{trip.status==="open"?"Набор открыт":"Набор закрыт"}</span>
              <span className="text-lg font-black text-[#D7FF35]">{formatMoney(trip.contribution_rub)}</span>
            </div>
            <h3 className="mt-3 text-lg font-bold">{trip.destination}</h3>
            <p className="mt-2 text-xs text-zinc-400"><MapPin className="mr-1 inline size-3.5"/>{trip.city}</p>
            <p className="mt-2 text-xs text-zinc-400"><CalendarDays className="mr-1 inline size-3.5"/>{new Date(trip.departure_at).toLocaleString("ru-RU")}</p>
            <p className="mt-2 text-xs text-zinc-400"><Users className="mr-1 inline size-3.5"/>{trip.seats} мест</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/partners" className="btn-ghost">Заявки в «Напарниках»</Link>
              {trip.status==="open" && <button type="button" className="btn-ghost" disabled={working} onClick={()=>void closeTrip(trip.id)}>Закрыть набор</button>}
            </div>
          </article>)}
          {!trips.length && <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-zinc-400">Платных выездов пока нет. Опубликуй первый после заполнения анкеты.</div>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-[#151915] p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D7FF35]">03 / Брони и расчёты</p>
        <h2 className="mt-2 text-xl font-bold">Мои подтверждённые заявки</h2>
        <p className="mt-2 text-xs leading-5 text-zinc-400">При принятии заявки система сохраняет цену и комиссию отдельно. Без платёжного провайдера статус «Не оплачено», деньги не списываются и не начисляются.</p>
        <div className="mt-4 space-y-2">
          {quotes.map((quote)=><div key={quote.request_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
            <div><p className="font-bold">{formatMoney(quote.fixed_price_rub)} · место</p><p className="mt-1 text-xs text-zinc-400">Комиссия {formatMoney(quote.estimated_commission_rub)} · гиду {formatMoney(quote.estimated_guide_net_rub)}</p></div>
            <span className="rounded-lg border border-amber-400/20 px-2.5 py-1 text-xs text-amber-300">{quote.payment_status==="not_collected"?"Не оплачено":quote.payment_status}</span>
          </div>)}
          {!quotes.length && <p className="text-sm text-zinc-500">Броней пока нет.</p>}
        </div>
      </section>
    </>}
  </Shell>;
}
