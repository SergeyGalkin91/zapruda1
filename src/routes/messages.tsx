import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, MapPin, MessageCircle, RefreshCw, Send, UserPlus, X } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Личные сообщения — ZAPRUDA" }, { name: "description", content: "Личные переписки по согласию и обмен выбранными рыболовными метками." }] }),
  validateSearch: (query: Record<string, unknown>) => ({ mark: typeof query.mark === "string" ? query.mark : "", ...(typeof query.to === "string" ? { to: query.to } : {}) }),
  component: Messages,
});

type Person = { id: string; username: string | null; display_name: string | null };
type Thread = { id: string; requester_id: string; recipient_id: string; status: "pending" | "accepted" | "declined"; created_at: string };
type Mark = { id: string; title: string; latitude: number; longitude: number };
type Dm = { id: string; thread_id: string; sender_id: string; kind: "text" | "location"; body: string; location_title: string | null; latitude: number | null; longitude: number | null; created_at: string };
const db = supabase as any;
const display = (p?: Person) => p?.display_name || p?.username || "Рыболов";
const datetime = (s: string) => new Date(s).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Messages() {
  const { mark: initialMark, to: requestedPerson } = Route.useSearch();
  const [uid, setUid] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [selectedMark, setSelectedMark] = useState(initialMark);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<Dm[]>([]);
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const { data: auth, error: ae } = await supabase.auth.getUser();
    if (ae || !auth.user) {
      setUid(""); setLoading(false);
      setError("Для личных сообщений войди в аккаунт.");
      return;
    }
    const id = auth.user.id;
    setUid(id);
    const [u, t, f, m] = await Promise.all([
      supabase.from("profiles").select("id,username,display_name").neq("id", id).order("created_at", { ascending: false }).limit(200),
      db.from("social_threads").select("id,requester_id,recipient_id,status,created_at").or("requester_id.eq." + id + ",recipient_id.eq." + id).order("created_at", { ascending: false }),
      supabase.from("follows").select("following_id").eq("follower_id", id),
      supabase.from("private_fishing_marks").select("id,title,latitude,longitude").eq("user_id", id).order("created_at", { ascending: false }).limit(100),
    ]);
    const failure = [u.error, t.error, f.error, m.error].find(Boolean);
    if (failure) setError("Ошибка загрузки данных: " + failure.message);
    else setError("");
    setPeople((u.data ?? []) as Person[]);
    setThreads((t.data ?? []) as Thread[]);
    setFollowing((f.data ?? []).map(row => row.following_id));
    setMarks((m.data ?? []) as Mark[]);
    setLoading(false);
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    const { data, error: qerr } = await db.from("social_messages")
      .select("id,thread_id,sender_id,kind,body,location_title,latitude,longitude,created_at")
      .eq("thread_id", id).order("created_at", { ascending: true }).limit(200);
    if (qerr) setError("Не удалось загрузить переписку: " + qerr.message);
    else setMessages((data ?? []) as Dm[]);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase.channel("zapruda-social-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_threads" }, () => void refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "social_messages" }, () => {
        if (activeId) void fetchMessages(activeId);
      }).subscribe();
    const update = () => { void refresh(); if (activeId) void fetchMessages(activeId); };
    window.addEventListener("focus", update);
    const poll = window.setInterval(() => { if (!document.hidden) update(); }, 12000);
    return () => { window.clearInterval(poll); window.removeEventListener("focus", update); void supabase.removeChannel(channel); };
  }, [refresh, fetchMessages, activeId]);

  useEffect(() => {
    if (activeId && threads.find(t => t.id === activeId)?.status === "accepted") void fetchMessages(activeId);
    else setMessages([]);
  }, [activeId, threads, fetchMessages]);

  useEffect(() => { if (initialMark) setSelectedMark(initialMark); }, [initialMark]);

  const getPeer = (t: Thread) => t.requester_id === uid ? t.recipient_id : t.requester_id;
  useEffect(() => {
    const person = people.find(p => p.id === requestedPerson);
    if (person) setFilter(person.username || person.display_name || "");
  }, [people, requestedPerson]);

  const names = useMemo(() => new Map(people.map(p => [p.id, display(p)])), [people]);
  const active = threads.find(t => t.id === activeId);
  const incoming = threads.filter(t => t.status === "pending" && t.recipient_id === uid);
  const outgoing = threads.filter(t => t.status === "pending" && t.requester_id === uid);
  const accepted = threads.filter(t => t.status === "accepted");
  const visiblePeople = people.filter(p => [p.username, p.display_name].some(v => (v ?? "").toLowerCase().includes(filter.trim().toLowerCase())));

  async function request(person: Person) {
    if (!uid || busy) return;
    const existing = threads.find(t => getPeer(t) === person.id);
    if (existing) { setActiveId(existing.id); setNotice(existing.status === "pending" ? "Запрос уже отправлен. Ждём согласия." : existing.status === "declined" ? "Запрос на переписку отклонён." : "Чат открыт."); return; }
    setBusy(true); setError(""); setNotice("");
    const { data, error: e } = await db.from("social_threads")
      .insert({ requester_id: uid, recipient_id: person.id }).select("id").single();
    setBusy(false);
    if (e) { setError("Не удалось отправить запрос: " + e.message); return; }
    setActiveId(data.id); setNotice("Запрос отправлен. Сообщения станут доступны после принятия.");
    await refresh();
  }

  async function decide(thread: Thread, status: "accepted" | "declined") {
    if (busy || thread.recipient_id !== uid) return;
    setBusy(true); setError("");
    const { error: e } = await db.from("social_threads").update({ status }).eq("id", thread.id);
    setBusy(false);
    if (e) { setError("Не удалось ответить: " + e.message); return; }
    if (status === "accepted") setActiveId(thread.id);
    setNotice(status === "accepted" ? "Запрос принят. Теперь можно переписываться." : "Запрос отклонён.");
    await refresh();
  }

  async function toggleFollow(id: string) {
    if (!uid || busy) return;
    setBusy(true); setError("");
    const isFollowing = following.includes(id);
    const { error: e } = isFollowing
      ? await supabase.from("follows").delete().eq("follower_id", uid).eq("following_id", id)
      : await supabase.from("follows").insert({ follower_id: uid, following_id: id });
    setBusy(false);
    if (e) setError("Подписка не изменена: " + e.message);
    else await refresh();
  }

  async function sendText(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!uid || !active || active.status !== "accepted" || !draft.trim() || busy) return;
    setBusy(true); setError("");
    const { error: e2 } = await db.from("social_messages").insert({
      thread_id: active.id, sender_id: uid, kind: "text", body: draft.trim(),
    });
    setBusy(false);
    if (e2) { setError("Сообщение не отправлено: " + e2.message); return; }
    setDraft(""); await fetchMessages(active.id);
  }

  async function sendMark() {
    const mark = marks.find(m => m.id === selectedMark);
    if (!mark || !uid || !active || active.status !== "accepted" || busy) return;
    // Explicit confirmation prevents accidental sharing of private coordinates.
    if (!window.confirm("Отправить «" + mark.title + "» с ТОЧНЫМИ координатами собеседнику? Отправленную копию нельзя отозвать.")) return;
    setBusy(true); setError("");
    const { error: e } = await db.from("social_messages").insert({
      thread_id: active.id, sender_id: uid, kind: "location", body: "",
      source_mark_id: mark.id, location_title: mark.title, latitude: mark.latitude, longitude: mark.longitude,
    });
    setBusy(false);
    if (e) { setError("Точка не отправлена: " + e.message); return; }
    setNotice("Отправлена только выбранная метка. Остальные точки остаются приватными.");
    await fetchMessages(active.id);
  }

  return <Shell>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#D7FF35]">ZAPRUDA / ОБЩЕНИЕ</p><h1 className="mt-1 text-3xl font-black text-white">Личные сообщения</h1><p className="mt-2 text-sm text-zinc-400">Переписка только после принятия запроса. Подписки не открывают личный чат автоматически.</p></div>
      <button className="btn-ghost inline-flex" type="button" onClick={() => void refresh()}><RefreshCw className="size-4"/> Обновить</button>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-200">{error} {!uid && <Link to="/auth" className="underline">Войти</Link>}</p>}
    {notice && <p role="status" className="mb-4 rounded-xl border border-[#D7FF35]/30 bg-[#D7FF35]/5 p-3 text-sm text-[#D7FF35]">{notice}</p>}
    {loading && <p className="text-zinc-400">Загружаем переписки…</p>}
    {!!uid && <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="space-y-5">
        <section className="panel p-4"><h2 className="mb-3 flex items-center gap-2 font-bold"><MessageCircle className="size-5 text-[#D7FF35]"/> Переписки ({accepted.length})</h2>
          {accepted.map(t => <button key={t.id} type="button" onClick={() => setActiveId(t.id)} className={"mb-1 flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm " + (activeId === t.id ? "border-[#D7FF35]/60 bg-[#D7FF35]/10" : "border-white/10")}>{names.get(getPeer(t)) || "Рыболов"}<span className="text-xs text-[#D7FF35]">Открыть</span></button>)}
          {!accepted.length && <p className="text-sm text-zinc-500">Пока нет подтверждённых переписок.</p>}
        </section>
        <section className="panel p-4"><h2 className="mb-3 font-bold">Запросы на переписку ({incoming.length})</h2>
          {incoming.map(t => <div key={t.id} className="mb-2 rounded-xl border border-white/10 p-3 text-sm">
            <p className="mb-2 font-semibold">{names.get(t.requester_id) || "Рыболов"} хочет написать тебе</p>
            <div className="flex gap-2"><button className="btn-primary inline-flex" onClick={() => void decide(t, "accepted")} disabled={busy}><Check className="size-4"/> Принять</button><button className="btn-ghost inline-flex" onClick={() => void decide(t, "declined")} disabled={busy}><X className="size-4"/> Отклонить</button></div>
          </div>)}
          {outgoing.map(t => <p key={t.id} className="mb-1 text-xs text-zinc-400">Ожидаем ответа: {names.get(t.recipient_id) || "Рыболов"}</p>)}
          {!incoming.length && !outgoing.length && <p className="text-xs text-zinc-500">Нет ожидающих запросов.</p>}
        </section>
        <section className="panel p-4"><h2 className="mb-2 flex items-center gap-2 font-bold"><UserPlus className="size-5 text-[#D7FF35]"/> Рыболовы</h2>
          <input className="field mb-3" aria-label="Поиск участников" placeholder="Поиск по никнейму" value={filter} onChange={e => setFilter(e.target.value)}/>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {visiblePeople.map(p => <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 p-3" key={p.id}>
              <span className="min-w-0 break-all text-sm font-bold">{display(p)}</span><div className="flex gap-2">
                <button type="button" className="btn-ghost px-2 py-1.5 text-xs" disabled={busy} onClick={() => void toggleFollow(p.id)}>{following.includes(p.id) ? "Отписаться" : "Подписаться"}</button>
                <button type="button" className="btn-ghost px-2 py-1.5 text-xs" disabled={busy} onClick={() => void request(p)}>{threads.some(t => getPeer(t) === p.id) ? "Чат / запрос" : "Написать"}</button>
              </div></div>)}
            {!visiblePeople.length && <p className="text-sm text-zinc-500">Пока нет других пользователей. Для проверки переписки понадобятся два аккаунта.</p>}
          </div>
        </section>
      </div>
      <section className="panel flex min-h-[500px] flex-col overflow-hidden">
        <div className="border-b border-white/10 p-4"><h2 className="font-bold">{active ? names.get(getPeer(active)) || "Переписка" : "Выбери переписку"}</h2>
          {active && <p className="text-xs text-zinc-400">{active.status === "accepted" ? "Личный чат · доступен только участникам" : "Ожидаем согласия на переписку"}</p>}
        </div>
        <div className="zapruda-chat-window min-h-64 flex-1 space-y-3 overflow-y-auto p-4">
          {active?.status === "accepted" && messages.map(m => <div key={m.id} className={"zapruda-chat-bubble max-w-[90%] rounded-2xl border p-3 text-sm " + (m.sender_id === uid ? "zapruda-chat-own-bubble ml-auto border-[#D7FF35]/30 bg-[#D7FF35]/10" : "border-white/10 bg-white/5")}>
            {m.kind === "location" && m.latitude !== null && m.longitude !== null ? <div><p className="flex items-center gap-2 font-bold text-[#D7FF35]"><MapPin className="size-4"/> {m.location_title}</p><p className="my-2 text-xs text-zinc-300">{m.latitude.toFixed(6)}, {m.longitude.toFixed(6)}</p>
              <a target="_blank" rel="noopener noreferrer" className="text-xs text-[#D7FF35] underline" href={"https://yandex.ru/maps/?pt=" + encodeURIComponent(m.longitude + "," + m.latitude) + "&z=15"}>Открыть на Яндекс Картах</a></div> : <p className="whitespace-pre-wrap break-words">{m.body}</p>}
            <time className="mt-2 block text-[10px] text-zinc-500">{datetime(m.created_at)}</time></div>)}
          {active?.status === "accepted" && !messages.length && <p className="text-sm text-zinc-500">Напиши первое сообщение.</p>}
          {!active && <p className="text-sm text-zinc-500">Выбери собеседника слева или отправь запрос на переписку.</p>}
          {active?.status !== "accepted" && active && <p className="text-sm text-zinc-500">Нельзя отправлять сообщения до принятия запроса.</p>}
        </div>
        {active?.status === "accepted" && <div className="space-y-3 border-t border-white/10 p-4">
          <div className="flex flex-wrap gap-2"><select className="field min-w-0 flex-1" aria-label="Выбрать приватную метку для отправки" value={selectedMark} onChange={e => setSelectedMark(e.target.value)}>
            <option value="">Поделиться сохранённой точкой…</option>
            {marks.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select><button className="btn-ghost inline-flex" type="button" disabled={!selectedMark || busy} onClick={() => void sendMark()}><MapPin className="size-4"/> Поделиться точкой</button></div>
          <p className="text-xs text-zinc-500">Координаты отправляются только после твоего подтверждения. Отправленную копию нельзя отозвать.</p>
          <form className="flex gap-2" onSubmit={sendText}><input className="field min-w-0 flex-1" placeholder="Сообщение…" value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000}/><button type="submit" className="btn-primary inline-flex" disabled={!draft.trim() || busy}><Send className="size-4"/> Отправить</button></form>
        </div>}
      </section>
    </div>}
  </Shell>;
}
