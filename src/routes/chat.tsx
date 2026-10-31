import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronRight, Globe2, MapPin, MessageCircle, Plus, RefreshCw, Send, Users } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/lib/geo";

type ChatTopic = "general" | "reports" | "waters" | "partners" | "gear" | "tips";
type Level = "global" | "country" | "region" | "city";
type Place = {
  id: string; parent_id: string | null; level: Level;
  country_code: string | null; name: string; created_by: string | null;
};
type ChatMessage = {
  id: string; user_id: string; body: string; created_at: string;
  profiles?: { username: string | null; display_name: string | null; avatar_url: string | null; chat_city: string | null } | null;
};
const GLOBAL_ID = "00000000-0000-4000-8000-000000000001";
const TOPICS: ReadonlyArray<{ key: ChatTopic; label: string; icon: string; description: string }> = [
  { key: "general", label: "Общий", icon: "💬", description: "Знакомства, разговоры и рыбацкие истории" },
  { key: "reports", label: "Трофеи и отчёты", icon: "🐟", description: "Кто, что и где поймал — без обязательной публикации точных координат" },
  { key: "waters", label: "Споты и вода", icon: "🌊", description: "Реки, озёра, условия и обсуждение подходов" },
  { key: "partners", label: "Напарники", icon: "🤝", description: "С кем поехать на рыбалку и как договориться" },
  { key: "gear", label: "Стафф", icon: "🎣", description: "Спиннинги, катушки, приманки и оснастки" },
  { key: "tips", label: "Советы", icon: "💡", description: "Тактика, проводки и помощь новичкам" },
];
const quick = ["🎣", "🐟", "🔥", "👍", "😂", "💪", "❤️", "👏", "🤝", "🏆"];
const VALID_TOPICS = TOPICS.map(t => t.key);
const api = supabase as any;

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [
    { title: "Чаты комьюнити — ZAPRUDA" },
    { name: "description", content: "Общение рыболовов по странам, областям, городам и тематическим веткам." },
  ] }),
  validateSearch: (query: Record<string, unknown>) => ({
    place: typeof query.place === "string" ? query.place : "",
    topic: VALID_TOPICS.includes(query.topic as ChatTopic) ? query.topic as ChatTopic : "general" as ChatTopic,
    country: typeof query.country === "string" ? query.country : "",
  }),
  component: GeographicChat,
});

function GeographicChat() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [uid, setUid] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [regionName, setRegionName] = useState("");
  const [cityName, setCityName] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!alive) return;
      if (authError || !auth.user) { setUid(""); setLoading(false); return; }
      setUid(auth.user.id);
      const { data, error: queryError } = await api.from("chat_places")
        .select("id,parent_id,level,country_code,name,created_by").order("name").limit(1500);
      if (!alive) return;
      if (queryError) setError("Не удалось загрузить географию чатов: " + queryError.message);
      else { setError(""); setPlaces((data || []) as Place[]); }
      setLoading(false);
    })().catch(e => {
      if (alive) { setError(e instanceof Error ? e.message : "Не удалось открыть чаты."); setLoading(false); }
    });
    return () => { alive = false; };
  }, []);

  const map = useMemo(() => new Map(places.map(p => [p.id, p])), [places]);
  const selectedPlace = map.get(search.place)
    || (search.country ? places.find(p => p.level === "country" && p.country_code === search.country) : undefined)
    || map.get(GLOBAL_ID);
  const placeId = selectedPlace?.id || GLOBAL_ID;
  const topic = search.topic;
  const crumbs = useMemo(() => {
    const result: Place[] = []; const seen = new Set<string>(); let cursor = selectedPlace;
    while (cursor && !seen.has(cursor.id)) {
      result.unshift(cursor); seen.add(cursor.id);
      cursor = cursor.parent_id ? map.get(cursor.parent_id) : undefined;
    }
    return result;
  }, [selectedPlace, map]);
  const country = crumbs.find(p => p.level === "country");
  const region = crumbs.find(p => p.level === "region");
  const city = crumbs.find(p => p.level === "city");
  const countryPlaces = places.filter(p => p.level === "country")
    .sort((a, b) => {
      const ai = countries.findIndex(c => c.code === a.country_code);
      const bi = countries.findIndex(c => c.code === b.country_code);
      return ai - bi;
    });
  const regions = places.filter(p => p.parent_id === country?.id && p.level === "region");
  const cities = places.filter(p => p.parent_id === region?.id && p.level === "city");
  const currentTopic = TOPICS.find(t => t.key === topic) || TOPICS[0];

  function go(id: string, newTopic: ChatTopic = topic) {
    setDraft(""); setChatError("");
    void navigate({ to: "/chat", search: { place: id, topic: newTopic, country: "" } });
  }

  useEffect(() => {
    if (!uid || !selectedPlace) return;
    let alive = true;
    setMessages([]);
    setChatError("");
    setChatLoading(true);

    const fetchMessages = async () => {
      const { data, error: queryError } = await api.from("chat_messages")
        .select("id,user_id,body,created_at,profiles(username,display_name,avatar_url,chat_city)")
        .eq("place_id", selectedPlace.id).eq("topic", topic)
        .order("created_at", { ascending: false }).limit(100);
      if (!alive) return;
      setChatLoading(false);
      if (queryError) setChatError("Не удалось открыть ветку: " + queryError.message);
      else { setChatError(""); setMessages(((data || []) as ChatMessage[]).reverse()); }
    };
    void fetchMessages();
    const channel = supabase.channel("zapruda-chat-" + selectedPlace.id + "-" + topic)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "chat_messages",
        filter: "place_id=eq." + selectedPlace.id,
      }, () => { void fetchMessages(); }).subscribe();
    const onFocus = () => { void fetchMessages(); };
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [uid, selectedPlace?.id, topic, refreshIndex]);

  async function createPlace(e: FormEvent<HTMLFormElement>, level: "region" | "city") {
    e.preventDefault();
    if (!uid || !country || creating || (level === "city" && !region)) return;
    const name = (level === "region" ? regionName : cityName).trim();
    if (name.length < 2 || name.length > 70) return;
    setCreating(true); setError("");
    const { data, error: createError } = await api.rpc("ensure_chat_place", {
      p_country_code: country.country_code,
      p_region: level === "region" ? name : region?.name,
      p_city: level === "city" ? name : null,
    });
    if (createError) {
      setError("Не удалось добавить раздел: " + createError.message);
      setCreating(false); return;
    }
    const { data: loaded, error: loadingError } = await api.from("chat_places")
      .select("id,parent_id,level,country_code,name,created_by").order("name").limit(1500);
    setCreating(false);
    if (loadingError) { setError("Раздел добавлен, но список не обновился: " + loadingError.message); return; }
    setPlaces((loaded || []) as Place[]);
    setRegionName(""); setCityName("");
    if (typeof data === "string") go(data, "general");
  }

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !uid || busy || !selectedPlace) return;
    setBusy(true); setChatError("");
    const { error: sendError } = await api.from("chat_messages")
      .insert({ user_id: uid, body, place_id: selectedPlace.id, topic });
    setBusy(false);
    if (sendError) { setChatError("Сообщение не отправлено: " + sendError.message); return; }
    setDraft("");
    setRefreshIndex(i => i + 1);
  }

  return <Shell>
    <header className="mb-5 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#1D2617] via-[#101410] to-[#080A08] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] sm:p-8">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#D7FF35]">
        <Globe2 className="size-4" /> ZAPRUDA / ЧАТЫ СООБЩЕСТВА
      </p>
      <h1 className="mt-3 text-[clamp(2rem,5vw,3.7rem)] font-black uppercase leading-[0.98] tracking-[-0.05em] text-white">СВОИ НА СВЯЗИ</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Выбирай свою страну, область и город. На каждом уровне свои ветки обсуждений.
        Общий чат всей ZAPRUDA остаётся отдельно — старые сообщения не пропали.
      </p>
    </header>

    {loading && <p className="mb-5 text-sm text-zinc-400">Загружаем разделы чатов…</p>}
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>}
    {!loading && !uid && <p className="mb-5 rounded-xl border border-white/15 p-4 text-sm text-zinc-300">
      Для просмотра чатов и отправки сообщений <Link to="/auth" className="font-bold text-[#D7FF35] underline">войди в аккаунт</Link>.
    </p>}

    {uid && <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-4 rounded-[24px] border border-white/10 bg-[#0E120F] p-4 lg:sticky lg:top-24">
        <button type="button" onClick={() => go(GLOBAL_ID, "general")}
          aria-pressed={placeId === GLOBAL_ID}
          className={"flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-bold transition " +
            (placeId === GLOBAL_ID ? "border-[#D7FF35] bg-[#D7FF35]/10 text-[#D7FF35]" : "border-white/10 hover:border-[#D7FF35]/30")}>
          <Globe2 className="size-5" /> Вся ZAPRUDA
        </button>
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-400">01 · Страна</p>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {countryPlaces.map(p => {
              const info = countries.find(x => x.code === p.country_code);
              return <button key={p.id} type="button" aria-pressed={country?.id === p.id} onClick={() => go(p.id)}
                className={"flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition " +
                  (country?.id === p.id ? "border-[#D7FF35]/65 bg-[#D7FF35]/10 text-[#D7FF35]" : "border-white/10 bg-black/10 text-zinc-300 hover:border-white/30")}>
                <span className="text-base" aria-hidden="true">{info?.flag || "🌍"}</span>
                <span>{info?.name || p.name}</span>
              </button>;
            })}
          </div>
        </div>
        {country && <div className="border-t border-white/10 pt-4">
          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-400">02 · Область / регион</p>
          <button type="button" onClick={() => go(country.id)} aria-pressed={placeId === country.id}
            className={"mb-2 w-full rounded-lg border px-3 py-2 text-left text-xs " +
              (placeId===country.id?"border-[#D7FF35] text-[#D7FF35]":"border-white/10 text-zinc-300")}>
            Общий чат страны
          </button>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {regions.map(p => <button type="button" key={p.id} onClick={() => go(p.id)} aria-pressed={region?.id===p.id}
              className={"flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition "+
                (region?.id===p.id?"border-[#D7FF35]/65 bg-[#D7FF35]/10 text-[#D7FF35]":"border-white/10 text-zinc-300 hover:border-white/30")}>
              <span>{p.name}</span><ChevronRight className="size-3.5 shrink-0" />
            </button>)}
          </div>
          {!regions.length && <p className="text-xs text-zinc-500">Пока нет регионов.</p>}
          <form onSubmit={e => void createPlace(e, "region")} className="mt-3 flex gap-1.5">
            <input className="field min-w-0 flex-1 text-xs" placeholder="Добавить регион…" aria-label="Название новой области или региона"
              value={regionName} onChange={e => setRegionName(e.target.value)} minLength={2} maxLength={70} />
            <button className="btn-ghost inline-flex" type="submit" aria-label="Добавить регион" title="Добавить регион"
              disabled={!regionName.trim() || creating}><Plus className="size-4" /></button>
          </form>
        </div>}
        {region && <div className="border-t border-white/10 pt-4">
          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-400">03 · Город</p>
          <button type="button" onClick={() => go(region.id)} aria-pressed={placeId===region.id}
            className={"mb-2 w-full rounded-lg border px-3 py-2 text-left text-xs "+
              (placeId===region.id?"border-[#D7FF35] text-[#D7FF35]":"border-white/10 text-zinc-300")}>
            Общий чат региона
          </button>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {cities.map(p=><button key={p.id} type="button" onClick={() => go(p.id)} aria-pressed={city?.id===p.id}
              className={"flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition "+
                (city?.id===p.id?"border-[#D7FF35]/65 bg-[#D7FF35]/10 text-[#D7FF35]":"border-white/10 text-zinc-300 hover:border-white/30")}>
              <MapPin className="size-3.5 shrink-0" />{p.name}
            </button>)}
          </div>
          {!cities.length && <p className="text-xs text-zinc-500">Города пока не добавлены.</p>}
          <form onSubmit={e => void createPlace(e, "city")} className="mt-3 flex gap-1.5">
            <input className="field min-w-0 flex-1 text-xs" placeholder="Добавить город…" aria-label="Название нового города"
              value={cityName} onChange={e => setCityName(e.target.value)} minLength={2} maxLength={70} />
            <button className="btn-ghost inline-flex" type="submit" aria-label="Добавить город" title="Добавить город"
              disabled={!cityName.trim() || creating}><Plus className="size-4"/></button>
          </form>
        </div>}
        <p className="border-t border-white/10 pt-3 text-xs leading-5 text-zinc-500">
          Нет своего города? Добавь регион, затем город. Новые разделы создаются участниками; названия пока не проверяются по географическому справочнику.
        </p>
      </aside>

      <div className="min-w-0 space-y-3 rounded-[22px]">
        <nav aria-label="Путь к чату" className="flex flex-wrap items-center gap-1 text-xs">
          {crumbs.map((p,i)=><span key={p.id} className="inline-flex items-center gap-1">
            {i>0&&<ChevronRight className="size-3.5 text-zinc-500" />}
            <button type="button" onClick={() => go(p.id)} aria-current={placeId===p.id?"page":undefined}
              className={"rounded-md px-1.5 py-1 hover:bg-white/5 "+(placeId===p.id?"font-bold text-[#D7FF35]":"text-zinc-400")}>
              {p.name}
            </button>
          </span>)}
        </nav>
        <div className="panel flex min-h-[650px] flex-col overflow-hidden">
          <div className="border-b border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-base font-black text-white">
                  <MessageCircle className="size-5 text-[#D7FF35]"/>
                  {selectedPlace?.name || "Вся ZAPRUDA"}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {selectedPlace?.level==="city"?"Городской чат":selectedPlace?.level==="region"?"Чат региона":selectedPlace?.level==="country"?"Чат страны":"Общий чат сообщества"}
                  {" · отдельная переписка для каждого раздела"}
                </p>
              </div>
              <button type="button" onClick={() => setRefreshIndex(i=>i+1)}
                className="btn-ghost inline-flex min-h-9 items-center gap-2 px-3 text-xs"><RefreshCw className="size-4"/> Обновить</button>
            </div>
            <div aria-label="Тематические ветки" className="mt-4 flex flex-wrap gap-1.5">
              {TOPICS.map(t=><button type="button" key={t.key} onClick={() => go(placeId,t.key)} aria-pressed={topic===t.key}
                className={"rounded-lg border px-3 py-2 text-xs font-semibold transition "+
                  (topic===t.key?"border-[#D7FF35] bg-[#D7FF35] text-[#101410]":"border-white/10 bg-black/15 text-zinc-300 hover:border-[#D7FF35]/40")}>
                {t.icon} {t.label}
              </button>)}
            </div>
            <p className="mt-3 text-xs text-zinc-500">{currentTopic.description}</p>
          </div>
          <div className="zapruda-chat-window min-h-[360px] flex-1 space-y-5 overflow-y-auto bg-[#090C0B] p-4 sm:p-6" aria-live="polite">
            {chatLoading&&<p className="text-sm text-zinc-400">Загружаем сообщения ветки…</p>}
            {chatError&&<p role="alert" className="rounded-xl border border-red-400/30 bg-red-950/15 p-3 text-sm text-red-200">{chatError}</p>}
            {!chatLoading&&!chatError&&!messages.length&&<p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-zinc-400">
              Здесь ещё нет сообщений. Начни обсуждение в ветке «{currentTopic.label}» для «{selectedPlace?.name||"Вся ZAPRUDA"}»!
            </p>}
            {messages.map(message=><article key={message.id} className={message.user_id===uid?"ml-auto max-w-[90%] space-y-1.5 sm:max-w-[78%]":"mr-auto max-w-[90%] space-y-1.5 sm:max-w-[78%]"}>
              <div className={"flex flex-wrap items-center gap-2 text-xs text-zinc-400 "+(message.user_id===uid?"justify-end":"")}>
                <span className="flex size-7 items-center justify-center rounded-full bg-white/10 text-sm">🎣</span>
                <span className="font-bold text-white">
                  {message.profiles?.display_name||message.profiles?.username||(message.user_id===uid?"Вы":"Рыболов")}
                  {message.profiles?.chat_city&&<span className="ml-1 font-normal text-[#D7FF35]">({message.profiles.chat_city})</span>}
                  {message.user_id===uid&&<span className="ml-1 font-normal text-zinc-500">· Вы</span>}
                </span>
                <time dateTime={message.created_at} className="text-[10px]">
                  {new Date(message.created_at).toLocaleString("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
                </time>
              </div>
              <div className={"zapruda-chat-bubble whitespace-pre-wrap break-words rounded-[20px] border px-4 py-3 text-sm leading-6 "+(message.user_id===uid?"zapruda-chat-own-bubble ":"zapruda-chat-incoming-bubble ")+(message.user_id===uid?"rounded-tr-sm border-[#D7FF35]/30 bg-[#D7FF35]/10 text-white":"rounded-tl-sm border-[#A78BFA]/20 bg-[#191722] text-zinc-100")}>
                {message.body}
              </div>
            </article>)}
          </div>
          {!loading && !uid && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#A78BFA]/20 bg-[#211B2D] px-4 py-3 text-sm text-[#DDD6FE]"><span>Чтобы писать в чаты ZAPRUDA, войди в аккаунт.</span><Link to="/auth" search={{ mode: "in" }} className="inline-flex min-h-10 items-center rounded-full bg-[#D7FF35] px-4 text-xs font-black uppercase text-black">Войти</Link></div>}
          <form className="space-y-3 border-t border-[#A78BFA]/15 bg-[#101211] p-3 sm:p-4" onSubmit={send}>
            <div className="flex flex-wrap gap-1">
              {quick.map(q=><button key={q} type="button" title={"Вставить "+q}
                onClick={() => setDraft(d=>(d+q).slice(0,2000))}
                className="rounded-md px-2 py-1 text-lg transition hover:-translate-y-0.5 hover:bg-white/10">{q}</button>)}
            </div>
            <div className="flex gap-2">
              <input className="field min-w-0 flex-1" aria-label="Сообщение для выбранной ветки"
                placeholder={"Написать в «"+currentTopic.label+"»…"}
                value={draft} onChange={e => setDraft(e.target.value)} disabled={!uid||busy||chatLoading} maxLength={2000}/>
              <button type="submit" className="btn-primary inline-flex min-h-11 items-center gap-2"
                disabled={!draft.trim()||!uid||busy||chatLoading}>
                <Send className="size-4"/> {busy?"Отправляем…":"Отправить"}
              </button>
            </div>
          </form>
        </div>
        <p className="flex items-start gap-2 text-xs leading-5 text-zinc-500">
          <Users className="mt-0.5 size-4 shrink-0"/> Географические ветки публичны для авторизованных пользователей ZAPRUDA. Приватные точки лучше передавать через личные сообщения, только по своему согласию.
        </p>
        <Link to="/messages" search={{mark:""}} className="panel flex items-center justify-between p-4 transition hover:border-[#D7FF35]/40">
          <span><strong className="block text-sm">Личные сообщения</strong><span className="text-xs text-zinc-400">Отдельные переписки по запросу, не видны другим участникам</span></span>
          <span className="flex items-center gap-1 text-xs font-semibold text-[#D7FF35]">Открыть <ChevronRight className="size-4"/></span>
        </Link>
      </div>
    </div>}
  </Shell>;
}
