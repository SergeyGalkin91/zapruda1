import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronRight, Globe2, MapPin, MessageCircle, Plus, RefreshCw, Reply, Send, Users } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/lib/geo";
import { chatPhotoError, chatPhotoPath, shouldCreateChatMessage } from "@/lib/chat-media";

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
type ChatReaction = { id: string; message_id: string; user_id: string; emoji: string };
const REACTION_EMOJI = ["❤️", "👍", "🔥", "😂"] as const;
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
  const [reactions, setReactions] = useState<ChatReaction[]>([]);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [pendingPhotoMessageId, setPendingPhotoMessageId] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [regionName, setRegionName] = useState("");
  const [cityName, setCityName] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);
  const threadOpen = Boolean(search.place);

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
    if (pendingPhotoMessageId) {
      setChatError("Сначала повтори загрузку фотографии или нажми «Оставить сообщение без фото». Переключение чата пока заблокировано.");
      return;
    }
    setDraft(""); setPhoto(null); setPendingPhotoMessageId(null); setReplyTo(null); setChatError("");
    void navigate({ to: "/chat", search: { place: id, topic: newTopic, country: "" } });
  }

  function closeThread() {
    if (pendingPhotoMessageId) { setChatError("Сначала заверши или отмени загрузку фото."); return; }
    setDraft(""); setPhoto(null); setReplyTo(null); setChatError("");
    void navigate({ to: "/chat", search: { place: "", topic, country: "" } });
  }

  useEffect(() => {
    if (!uid || !selectedPlace || !threadOpen) return;
    let alive = true;
    setMessages([]);
    setReactions([]);
    setPhotoUrls({});
    setChatError("");
    setChatLoading(true);

    let requestNumber = 0;
    const fetchMessages = async () => {
      const thisRequest = ++requestNumber;
      const { data, error: queryError } = await api.from("chat_messages")
        .select("id,user_id,body,created_at,profiles(username,display_name,avatar_url,chat_city)")
        .eq("place_id", selectedPlace.id).eq("topic", topic)
        .order("created_at", { ascending: false }).limit(100);
      if (!alive || thisRequest !== requestNumber) return;
      setChatLoading(false);
      if (queryError) { setChatError("Не удалось открыть ветку: " + queryError.message); return; }
      else {
        setChatError("");
        const fetched = ((data || []) as ChatMessage[]).reverse();
        setMessages(fetched);
        if (fetched.length) {
          const { data: liked, error: reactionError } = await api.from("chat_message_reactions")
            .select("id,message_id,user_id,emoji").in("message_id", fetched.map(m => m.id));
          if (alive && thisRequest === requestNumber && !reactionError) setReactions((liked || []) as ChatReaction[]);
          const { data: attached } = await api.from("chat_message_photos")
            .select("message_id,storage_path").in("message_id", fetched.map(m => m.id));
          if (alive && thisRequest === requestNumber && attached?.length) {
            const signed = await Promise.all(attached.map(async (p: {message_id:string; storage_path:string}) => {
              const { data: link } = await supabase.storage.from("chat-photos").createSignedUrl(p.storage_path, 1800);
              return [p.message_id, link?.signedUrl || ""] as const;
            }));
            if (alive && thisRequest === requestNumber) setPhotoUrls(Object.fromEntries(signed));
          } else if (alive && thisRequest === requestNumber) setPhotoUrls({});

        } else { setReactions([]); setPhotoUrls({}); }
      }
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
  }, [uid, selectedPlace?.id, topic, refreshIndex, threadOpen]);

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

  async function toggleReaction(messageId: string, emoji: string) {
    if (!uid || reactingTo) return;
    setReactingTo(messageId);
    const mine = reactions.find(r => r.message_id === messageId && r.user_id === uid);
    try {
      if (mine) {
        const { error: removeError } = await api.from("chat_message_reactions").delete().eq("id", mine.id).eq("user_id", uid);
        if (removeError) throw removeError;
        setReactions(current => current.filter(r => r.id !== mine.id));
      }
      if (!mine || mine.emoji !== emoji) {
        const { data: added, error: addError } = await api.from("chat_message_reactions")
          .insert({ message_id: messageId, user_id: uid, emoji })
          .select("id,message_id,user_id,emoji").single();
        if (addError) throw addError;
        if (added) setReactions(current => [...current.filter(r => r.message_id !== messageId || r.user_id !== uid), added as ChatReaction]);
      }
    } catch (cause) {
      setChatError(cause instanceof Error ? cause.message : "Не удалось сохранить реакцию.");
      setRefreshIndex(n => n + 1);
    } finally { setReactingTo(null); }
  }

  function abandonPendingPhoto() {
    // The text message is already persisted. Only cancel its unfinished attachment.
    setPendingPhotoMessageId(null);
    setPhoto(null);
    setDraft("");
    setReplyTo(null);
    setChatError("");
    setRefreshIndex(index => index + 1);
  }

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if ((!body && !photo) || !uid || busy || !selectedPlace) return;
    const author = replyTo?.profiles?.display_name || replyTo?.profiles?.username || "Рыболов";
    const quoted = replyTo ? replyTo.body.slice(0, 180).replace(/\s+/g, " ").trim() : "";
    const outgoing = replyTo ? "↪ " + author.slice(0, 40) + ": " + quoted + "\n" + body : body;
    if (!pendingPhotoMessageId && outgoing.length > 2000) {
      setChatError("Сообщение с цитатой не должно превышать 2000 символов."); return;
    }
    const validationError = chatPhotoError(photo);
    if (validationError) { setChatError(validationError); return; }
    setBusy(true);
    setChatError("");
    try {
      let messageId = pendingPhotoMessageId;
      if (shouldCreateChatMessage(messageId)) {
        const { data: message, error: sendError } = await api.from("chat_messages")
          .insert({ user_id: uid, body: outgoing || "📷 Фото", place_id: selectedPlace.id, topic })
          .select("id").single();
        if (sendError || !message?.id) throw new Error("Сообщение не отправлено: " + (sendError?.message || "сервер не вернул ID"));
        messageId = message.id as string;
        if (photo) setPendingPhotoMessageId(messageId);
      }
      if (photo && messageId) {
        const path = chatPhotoPath(uid, messageId, photo.type, crypto.randomUUID());
        const { error: uploadError } = await supabase.storage.from("chat-photos")
          .upload(path, photo, { contentType: photo.type, upsert: false });
        if (uploadError) throw new Error("Фото не загружено: " + uploadError.message);
        const { error: linkError } = await api.from("chat_message_photos")
          .insert({ message_id: messageId, user_id: uid, storage_path: path });
        if (linkError) {
          await supabase.storage.from("chat-photos").remove([path]).catch(() => undefined);
          throw new Error("Фото не прикреплено: " + linkError.message);
        }
      }
      setDraft("");
      setPhoto(null);
      setPendingPhotoMessageId(null);
      setReplyTo(null);
      setRefreshIndex(i => i + 1);
    } catch (cause) {
      setChatError((pendingPhotoMessageId ? "Попробуй повторить загрузку. " : "") +
        (cause instanceof Error ? cause.message : "Неожиданная ошибка отправки."));
      setRefreshIndex(i => i + 1);
    } finally {
      setBusy(false);
    }
  }

  return <Shell>
    {!threadOpen && <header className="mb-4 rounded-[26px] border border-[#252A38] bg-[#070B10] px-4 pb-5 pt-5 sm:px-7 sm:pt-7">
      <div className="mb-7 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-black italic leading-none tracking-[-0.075em] text-[#D7FF35] sm:text-3xl">ZAPRUDA <span aria-hidden="true">♧</span></p>
          <p className="mt-1 pl-5 text-[9px] font-bold uppercase tracking-[0.48em] text-[#D7FF35]">COMMUNITY</p>
        </div>
        <Link to="/reports/new" className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/75 text-2xl font-light text-white hover:border-[#D7FF35] hover:text-[#D7FF35]" aria-label="Создать отчёт"><Plus className="size-6" /></Link>
      </div>
      <h1 className="text-[clamp(1.7rem,6vw,3.2rem)] font-black uppercase leading-[1.04] tracking-[-0.045em] text-white">СВОИ НА СВЯЗИ</h1>
      <div className="mt-6 grid grid-cols-[0.8fr_1.2fr_1.5fr] gap-2" role="group" aria-label="Фильтр чатов">
        <span className="flex min-h-11 items-center justify-center rounded-2xl bg-[#D7FF35] px-2 text-sm font-black text-[#10140A]" aria-current="true">Все</span>
        <span className="flex min-h-11 items-center justify-center rounded-2xl border border-[#293147] bg-[#0D121C] px-2 text-center text-sm text-[#A99AD9]" title="Фильтр появится после реализации учёта участия в чатах">Мои чаты</span>
        <span className="flex min-h-11 items-center justify-center rounded-2xl border border-[#293147] bg-[#0D121C] px-2 text-center text-xs text-[#A99AD9]" title="Появится после подключения учёта прочтений">Непрочитанные</span>
      </div>
    </header>}

    {loading && <p className="mb-5 text-sm text-zinc-400">Загружаем разделы чатов…</p>}
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>}
    {!loading && !uid && <p className="mb-5 rounded-xl border border-white/15 p-4 text-sm text-zinc-300">
      Для просмотра чатов и отправки сообщений <Link to="/auth" className="font-bold text-[#D7FF35] underline">войди в аккаунт</Link>.
    </p>}

    {uid && <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      {!threadOpen && <section className="lg:col-span-2" aria-label="Тематические чаты ZAPRUDA">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black uppercase tracking-tight text-white">Свои на связи</h2>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black tracking-widest text-[#D7FF35]">ZAPRUDA</span>
        </div>
        <div className="overflow-hidden rounded-[24px] border border-[#23283A] bg-[#090D13] px-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 xl:grid-cols-3">
          {TOPICS.map((t) => (
            <button key={t.key} type="button" onClick={() => go(placeId, t.key)}
              aria-pressed={topic === t.key}
              className={"flex w-full min-h-[88px] items-center gap-3 border-b border-[#202535] p-3 text-left transition last:border-b-0 hover:bg-[#151825] sm:min-h-28 sm:rounded-2xl sm:border " +
                (topic === t.key ? "bg-[#171528] sm:border-[#D7FF35]/60" : "bg-transparent sm:border-[#34304D] sm:bg-[#0B1014]")}>
              <span className="flex size-[66px] shrink-0 items-center justify-center rounded-2xl border border-[#34304D] bg-[#131925] text-3xl" aria-hidden="true">{t.icon}</span>
              <span className="min-w-0">
                <span className="block text-base font-black text-white">{t.label}</span>
                <span className="mt-1 block text-xs leading-5 text-[#A99AD9]">{t.description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>}
      {!threadOpen && <aside className="space-y-4 rounded-[24px] border border-white/10 bg-[#0E120F] p-4 lg:sticky lg:top-24">
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
      </aside>}

      {threadOpen && <div className="min-w-0 space-y-3 rounded-[22px] lg:col-span-2">
        <button type="button" onClick={closeThread} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-[#10131A] px-4 text-sm font-bold text-white hover:border-[#D7FF35]/60" aria-label="Вернуться к списку чатов">← Все чаты</button>
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
              <div className={"zapruda-chat-bubble whitespace-pre-wrap break-words rounded-[20px] border px-4 py-3 text-sm leading-6 "+(message.user_id===uid?"zapruda-chat-own-bubble ":"zapruda-chat-incoming-bubble ")+(message.user_id===uid?"rounded-tr-sm border-[#D7FF35] bg-[#D7FF35] text-[#11170A] shadow-[0_8px_28px_rgba(215,255,53,0.12)]":"rounded-tl-sm border-[#3E345B] bg-[#292140] text-[#F5F2FF]")}>
                {message.body}
                {photoUrls[message.id] && <a href={photoUrls[message.id]} target="_blank" rel="noopener noreferrer" className="mt-3 block overflow-hidden rounded-xl border border-black/10">
                  <img src={photoUrls[message.id]} alt="Фото из рыболовного чата" loading="lazy" className="max-h-72 max-w-full rounded-xl object-contain" />
                </a>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {REACTION_EMOJI.map(emoji => {
                  const likes = reactions.filter(r => r.message_id === message.id && r.emoji === emoji);
                  const selected = likes.some(r => r.user_id === uid);
                  return <button key={emoji} type="button" disabled={!uid || !!reactingTo}
                    onClick={() => void toggleReaction(message.id, emoji)}
                    aria-label={"Реакция " + emoji + " на сообщение"}
                    aria-pressed={selected}
                    className={"rounded-full border px-2 py-1 text-xs transition " + (selected ? "border-[#D7FF35]/70 bg-[#D7FF35]/15 text-white" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30")}>
                    {emoji}{likes.length ? " " + likes.length : ""}
                  </button>;
                })}
              </div>
              {uid && <button type="button" onClick={() => setReplyTo(message)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-[#D7FF35]">
                <Reply className="size-3.5" /> Ответить
              </button>}
            </article>)}
          </div>
          {!loading && !uid && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#A78BFA]/20 bg-[#211B2D] px-4 py-3 text-sm text-[#DDD6FE]"><span>Чтобы писать в чаты ZAPRUDA, войди в аккаунт.</span><Link to="/auth" search={{ mode: "in" }} className="inline-flex min-h-10 items-center rounded-full bg-[#D7FF35] px-4 text-xs font-black uppercase text-black">Войти</Link></div>}
          <form className="space-y-3 border-t border-[#383048] bg-[#11131B] p-3 sm:p-4" onSubmit={send}>
            {replyTo && <div className="flex items-start justify-between gap-3 rounded-xl border-l-2 border-[#D7FF35] bg-white/5 px-3 py-2 text-xs text-zinc-300">
              <span className="min-w-0 truncate">Ответ: {replyTo.profiles?.display_name || replyTo.profiles?.username || "Рыболов"} — {replyTo.body.slice(0, 100)}</span>
              <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 font-semibold text-[#D7FF35]">Отмена</button>
            </div>}
            <div className="flex flex-wrap gap-1">
              {quick.map(q=><button key={q} type="button" title={"Вставить "+q}
                onClick={() => setDraft(d=>(d+q).slice(0,2000))}
                className="rounded-md px-2 py-1 text-lg transition hover:-translate-y-0.5 hover:bg-white/10">{q}</button>)}
            </div>
            {pendingPhotoMessageId && <p role="status" className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
              Сообщение уже отправлено. Повторная попытка загрузит фото к нему, не создавая нового сообщения.
            </p>}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-white/20 px-3 py-2 text-xs text-zinc-200 hover:border-[#D7FF35]">
                📷 {photo ? photo.name : "Прикрепить фото"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!uid || busy || !!pendingPhotoMessageId}
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    e.target.value = "";
                    const validationError = chatPhotoError(file);
                    if (validationError) { setChatError(validationError); return; }
                    setChatError(""); setPhoto(file);
                  }} />
              </label>
              {photo && !pendingPhotoMessageId && <button type="button" className="text-xs text-[#D7FF35]" onClick={() => setPhoto(null)}>Убрать фото</button>}
              {pendingPhotoMessageId && <button type="button" disabled={busy} className="text-xs text-amber-200 underline" onClick={abandonPendingPhoto}>Оставить сообщение без фото</button>}
            </div>
            <div className="flex gap-2">
              <input className="field min-w-0 flex-1 rounded-2xl border-[#39334A] bg-[#1B1B2A] text-[#F6F5FF] placeholder:text-[#8B88A3] focus:border-[#D7FF35]" aria-label="Сообщение для выбранной ветки"
                placeholder={"Написать в «"+currentTopic.label+"»…"}
                value={draft} onChange={e => setDraft(e.target.value)} disabled={!uid||busy||chatLoading||!!pendingPhotoMessageId} maxLength={2000}/>
              <button type="submit" className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D7FF35] px-4 font-black text-[#11170A]"
                disabled={(!draft.trim() && !photo)||!uid||busy||chatLoading}>
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
      </div>}
    </div>}
  </Shell>;
}
