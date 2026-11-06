import { useCallback, useEffect, useState, useRef, type FormEvent } from "react";
import { MapPin, Plus, Users, MessageCircle } from "lucide-react";
import { MobileField, StickyFormActions } from "@/components/MobileForm";
import { supabase } from "@/integrations/supabase/client";
import { localDateTimeToIso, toLocalDateTimeInput } from "@/lib/meetup-datetime";

type Post = {
  id: string;
  owner_id: string;
  country_code: string;
  region_code: string;
  city_code: string;
  title: string;
  description: string;
  status: string;
};
type Member = { post_id: string; user_id: string; role: string; status: string };
type Message = { id: string; sender_id: string; body: string; created_at: string };
const db = supabase;

export function SocialMeetups() {
  const [userId, setUserId] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [occupancy, setOccupancy] = useState<Record<string, number>>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [privatePlace, setPrivatePlace] = useState("");
  const [meetingAt, setMeetingAt] = useState("");
  const [detailsReady, setDetailsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const latestRequest = useRef(0);
  const chatRequest = useRef(0);
  const messageRequest = useRef(0);
  const activeRef = useRef("");
  const accessRef = useRef({ userId, members, posts });
  accessRef.current = { userId, members, posts };
  useEffect(
    () => () => {
      latestRequest.current++;
      chatRequest.current++;
      messageRequest.current++;
      activeRef.current = "";
    },
    [],
  );
  const refresh = useCallback(async () => {
    const request = ++latestRequest.current;
    const { data: auth } = await supabase.auth.getUser();
    if (request !== latestRequest.current) return;
    const uid = auth.user?.id ?? "";
    setUserId(uid);
    if (!uid) {
      setPosts([]);
      setMembers([]);
      return;
    }
    if (!country.trim() || !region.trim() || !city.trim()) {
      setPosts([]);
      setMembers([]);
      setOccupancy({});
      return;
    }
    const [p, m] = await Promise.all([
      db
        .from("meetup_posts")
        .select("id,owner_id,country_code,region_code,city_code,title,description,status")
        .eq("country_code", country.trim().toUpperCase())
        .eq("region_code", region.trim())
        .eq("city_code", city.trim())
        .order("created_at", { ascending: false })
        .limit(100),
      db.from("meetup_members").select("post_id,user_id,role,status"),
    ]);
    if (request !== latestRequest.current) return;
    if (p.error || m.error) {
      setError("СХОДКИ пока недоступны: " + (p.error?.message || m.error?.message));
      return;
    }
    setPosts(p.data ?? []);
    setMembers(m.data ?? []);
    const counts = await Promise.all(
      (p.data ?? []).map(async (post: Post) => ({
        id: post.id,
        result: await db.rpc("meetup_occupancy", { p_post: post.id }),
      })),
    );
    if (request !== latestRequest.current) return;
    const failed = counts.find((x) => x.result.error);
    if (failed) {
      setError("Не удалось определить свободные места. Повторите загрузку.");
      setOccupancy({});
      return;
    }
    setOccupancy(Object.fromEntries(counts.map((x) => [x.id, Number(x.result.data ?? 0)])));
  }, [country, region, city]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const membership = (id: string) => members.find((m) => m.post_id === id && m.user_id === userId);
  const accepted = (id: string) =>
    membership(id)?.status === "accepted" &&
    posts.some((p) => p.id === id && p.status !== "cancelled");
  const hasChatAccess = useCallback(
    (id: string) =>
      accessRef.current.posts.some((p) => p.id === id && p.status !== "cancelled") &&
      accessRef.current.members.some(
        (m) =>
          m.post_id === id && m.user_id === accessRef.current.userId && m.status === "accepted",
      ),
    [],
  );
  const clearChat = useCallback(() => {
    chatRequest.current++;
    messageRequest.current++;
    activeRef.current = "";
    setActive("");
    setMessages([]);
    setPrivatePlace("");
    setMeetingAt("");
    setDetailsReady(false);
    setDraft("");
  }, []);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if ((session?.user.id ?? "") === accessRef.current.userId) return;
      latestRequest.current++;
      clearChat();
      setUserId(session?.user.id ?? "");
      setMembers([]);
      setPosts([]);
      setOccupancy({});
      // Keep Auth callbacks synchronous; refresh after the auth lock is released.
      queueMicrotask(() => void refresh());
    });
    return () => data.subscription.unsubscribe();
  }, [clearChat, refresh]);
  const activeAccepted = active && accepted(active) ? active : "";
  useEffect(() => {
    if (active && !activeAccepted) clearChat();
  }, [active, activeAccepted, clearChat]);
  const fetchMessages = useCallback(
    async (id: string) => {
      const request = ++messageRequest.current;
      const currentUser = accessRef.current.userId;
      const [member, post, result] = await Promise.all([
        db
          .from("meetup_members")
          .select("status")
          .eq("post_id", id)
          .eq("user_id", currentUser)
          .maybeSingle(),
        db.from("meetup_posts").select("status").eq("id", id).maybeSingle(),
        db
          .from("meetup_messages")
          .select("id,sender_id,body,created_at")
          .eq("post_id", id)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(100),
      ]);
      if (request !== messageRequest.current || activeRef.current !== id || !hasChatAccess(id))
        return;
      if (
        member.error ||
        member.data?.status !== "accepted" ||
        post.error ||
        !post.data ||
        post.data.status === "cancelled"
      ) {
        clearChat();
        setError("Доступ к чату сходки больше не подтверждён. Обновите объявления.");
        return;
      }
      if (result.error) {
        setError("Не удалось загрузить переписку: " + result.error.message);
        return;
      }
      setMessages([...(result.data ?? [])].reverse());
    },
    [clearChat, hasChatAccess],
  );
  useEffect(() => {
    if (!activeAccepted) return;
    // Polling works even when the table is not enabled for Realtime publication.
    const update = () => {
      if (document.visibilityState !== "hidden") void fetchMessages(activeAccepted);
    };
    const timer = window.setInterval(update, 10000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [activeAccepted, fetchMessages]);
  async function create(e: FormEvent) {
    e.preventDefault();
    if (!userId || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const { error: err } = await db.from("meetup_posts").insert({
      owner_id: userId,
      country_code: country.trim().toUpperCase(),
      region_code: region.trim(),
      city_code: city.trim(),
      title: title.trim(),
      description: description.trim(),
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setTitle("");
    setDescription("");
    setNotice("Объявление опубликовано");
    await refresh();
  }
  async function join(id: string) {
    if (!userId || busy) return;
    setBusy(true);
    setError("");
    const previous = membership(id);
    const { error: err } =
      previous?.status === "declined"
        ? await db
            .from("meetup_members")
            .update({ status: "pending" })
            .eq("post_id", id)
            .eq("user_id", userId)
        : await db
            .from("meetup_members")
            .insert({ post_id: id, user_id: userId, role: "participant", status: "pending" });
    setBusy(false);
    if (err) setError(err.message);
    else {
      setNotice("Отклик отправлен организатору");
      await refresh();
    }
  }
  async function decide(id: string, user: string, status: "accepted" | "declined") {
    if (!userId || busy) return;
    setBusy(true);
    setError("");
    const { error: err } = await db
      .from("meetup_members")
      .update({ status })
      .eq("post_id", id)
      .eq("user_id", user);
    setBusy(false);
    if (err) setError(err.message);
    else {
      if (user === userId && status === "declined" && activeRef.current === id) clearChat();
      await refresh();
    }
  }
  async function cancel(id: string) {
    if (!userId || busy || posts.find((p) => p.id === id)?.owner_id !== userId) return;
    setBusy(true);
    setError("");
    const { error: err } = await db
      .from("meetup_posts")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("owner_id", userId);
    setBusy(false);
    if (err) setError(err.message);
    else {
      if (activeRef.current === id) clearChat();
      setNotice("Сходка отменена");
      await refresh();
    }
  }
  async function saveDetails(e: FormEvent) {
    e.preventDefault();
    if (
      !active ||
      !accepted(active) ||
      !detailsReady ||
      posts.find((p) => p.id === active)?.owner_id !== userId ||
      busy
    )
      return;
    let meeting_at: string | null;
    try {
      meeting_at = localDateTimeToIso(meetingAt);
    } catch {
      setError("Укажите корректное местное время встречи.");
      return;
    }
    const id = active;
    setBusy(true);
    setError("");
    const { error: err } = await db
      .from("meetup_private_details")
      .upsert(
        { post_id: id, owner_id: userId, private_place: privatePlace.trim() || null, meeting_at },
        { onConflict: "post_id" },
      );
    setBusy(false);
    if (err) {
      setError("Не удалось сохранить приватные детали: " + err.message);
      return;
    }
    if (activeRef.current === id) {
      setNotice("Приватные детали сохранены");
      await openChat(id);
    }
  }
  async function openChat(id: string) {
    if (!accepted(id)) {
      setError("Чат доступен только принятым участникам");
      return;
    }
    const request = ++chatRequest.current;
    messageRequest.current++;
    activeRef.current = id;
    setActive(id);
    setDetailsReady(false);
    setPrivatePlace("");
    setMeetingAt("");
    setMessages([]);
    setDraft("");
    setError("");
    const { data: details, error: detailsError } = await db
      .from("meetup_private_details")
      .select("private_place,meeting_at")
      .eq("post_id", id)
      .maybeSingle();
    if (request !== chatRequest.current || activeRef.current !== id || !hasChatAccess(id)) return;
    if (detailsError) {
      setError("Ошибка доступа к месту встречи: " + detailsError.message);
      return;
    }
    setPrivatePlace(details?.private_place ?? "");
    setMeetingAt(toLocalDateTimeInput(details?.meeting_at));
    setDetailsReady(true);
    await fetchMessages(id);
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !accepted(active) || busy) return;
    const id = active;
    setBusy(true);
    const { error: err } = await db
      .from("meetup_messages")
      .insert({ post_id: id, sender_id: userId, body: draft.trim() });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (activeRef.current === id) {
      setDraft("");
      await fetchMessages(id);
    }
  }
  const shown = posts.filter(
    (p) =>
      (!country || p.country_code === country.trim().toUpperCase()) &&
      (!region || p.region_code === region.trim()) &&
      (!city || p.city_code === city.trim()),
  );
  return (
    <section className="z-underground mt-6 space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#D7FF35]">
            Комьюнити · v0.7.1
          </p>
          <h2 className="mt-1 text-2xl font-black text-white">СХОДКИ</h2>
          <p className="text-sm text-zinc-400">
            Ищите своих в городе. До трёх участников. Точное место — только после принятия.
          </p>
        </div>
        <Users className="text-[#D7FF35]" aria-hidden="true" />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-[#D7FF35]">
          {notice}
        </p>
      )}
      {!userId && (
        <p className="text-sm text-zinc-300">Войдите, чтобы создавать объявления и откликаться.</p>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        <MobileField label="Страна (код)">
          <input
            value={country}
            maxLength={3}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="RU"
            className="field"
          />
        </MobileField>
        <MobileField label="Регион">
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Московская область"
            className="field"
          />
        </MobileField>
        <MobileField label="Город">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Москва"
            className="field"
          />
        </MobileField>
      </div>
      {userId && (
        <form onSubmit={create} className="grid gap-3 rounded-xl border border-[#D7FF35]/25 p-3">
          <h3 className="font-bold">+ Создать объявление</h3>
          <MobileField label="Заголовок сходки">
            <input
              required
              minLength={4}
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
            />
          </MobileField>
          <MobileField label="Описание сходки" hint="Что планируете ловить?">
            <textarea
              maxLength={1500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field"
            />
          </MobileField>
          <StickyFormActions>
            <button
              disabled={busy || !country || !region || !city}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Опубликовать
            </button>
          </StickyFormActions>
        </form>
      )}
      {(!country.trim() || !region.trim() || !city.trim()) && (
        <p className="text-sm text-zinc-400">
          Укажите страну, регион и город, чтобы увидеть местные объявления.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((p) => {
          const count = occupancy[p.id];
          const mine = membership(p.id),
            owner = p.owner_id === userId;
          return (
            <article key={p.id} className="rounded-xl border border-white/15 bg-black/20 p-4">
              <div className="flex justify-between gap-2">
                <h3 className="font-bold text-white">{p.title}</h3>
                <span className="text-[#D7FF35]">{count === undefined ? "—" : count}/3</span>
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs text-zinc-400">
                <MapPin size={13} />
                {p.country_code} · {p.region_code} · {p.city_code}
              </p>
              <p className="mt-2 text-sm text-zinc-300">{p.description}</p>
              {p.status === "cancelled" && (
                <p className="mt-2 text-sm text-zinc-400">Сходка отменена</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {!owner &&
                  (!mine || mine.status === "declined") &&
                  userId &&
                  p.status === "open" &&
                  count !== undefined &&
                  count < 3 && (
                    <button disabled={busy} onClick={() => void join(p.id)} className="btn-primary">
                      Откликнуться
                    </button>
                  )}
                {mine?.status === "pending" && (
                  <span className="text-xs text-zinc-400">Отклик ожидает решения</span>
                )}
                {!owner && mine && (mine.status === "pending" || mine.status === "accepted") && (
                  <button
                    disabled={busy}
                    onClick={() => void decide(p.id, userId, "declined")}
                    className="btn-ghost"
                  >
                    {mine.status === "accepted" ? "Выйти из сходки" : "Отозвать отклик"}
                  </button>
                )}
                {owner && p.status !== "cancelled" && (
                  <button disabled={busy} onClick={() => void cancel(p.id)} className="btn-ghost">
                    Отменить сходку
                  </button>
                )}
                {accepted(p.id) && (
                  <button
                    onClick={() => void openChat(p.id)}
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    <MessageCircle size={15} /> Частный чат
                  </button>
                )}
              </div>
              {owner &&
                members
                  .filter((m) => m.post_id === p.id && m.status === "pending")
                  .map((m) => (
                    <div
                      key={m.user_id}
                      className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2 text-xs"
                    >
                      <span>Заявка: {m.user_id.slice(0, 8)}…</span>
                      <button
                        disabled={busy || p.status !== "open" || count === undefined || count >= 3}
                        onClick={() => void decide(p.id, m.user_id, "accepted")}
                        className="text-[#D7FF35]"
                      >
                        Принять
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void decide(p.id, m.user_id, "declined")}
                        className="text-red-300"
                      >
                        Отклонить
                      </button>
                    </div>
                  ))}
            </article>
          );
        })}
      </div>
      {active && accepted(active) && (
        <form onSubmit={send} className="space-y-3 rounded-xl border border-[#D7FF35]/30 p-4">
          <h3 className="font-bold">Приватный чат сходки</h3>
          {detailsReady && (
            <div className="space-y-2 rounded-lg border border-white/10 p-3 text-sm">
              <p className="text-[#D7FF35]">Место и время доступны только принятым участникам</p>
              <p>{privatePlace || "Место уточняется"}</p>
              <p>{meetingAt ? new Date(meetingAt).toLocaleString("ru-RU") : "Время уточняется"}</p>
            </div>
          )}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {messages.map((m) => (
              <p key={m.id} className="text-sm text-zinc-200">
                {m.sender_id === userId ? "Вы" : "Участник"}: {m.body}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <MobileField label="Сообщение" className="min-w-0 flex-1">
              <input
                required
                maxLength={1500}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="field"
              />
            </MobileField>
            <button disabled={busy} className="btn-primary min-h-11 self-end">
              Отправить
            </button>
          </div>
        </form>
      )}
      {active &&
        accepted(active) &&
        detailsReady &&
        posts.find((p) => p.id === active)?.owner_id === userId && (
          <form onSubmit={saveDetails} className="space-y-2 rounded-xl border border-white/10 p-4">
            <h3 className="font-bold">Приватные детали для участников</h3>
            <MobileField label="Точное место встречи" hint="Место видят принятые участники сходки.">
              <input
                maxLength={500}
                value={privatePlace}
                onChange={(e) => setPrivatePlace(e.target.value)}
                className="field"
              />
            </MobileField>
            <MobileField label="Дата и время встречи">
              <input
                type="datetime-local"
                value={meetingAt}
                onChange={(e) => setMeetingAt(e.target.value)}
                className="field"
              />
            </MobileField>
            <StickyFormActions>
              <button disabled={busy} className="btn-primary">
                Сохранить место и время
              </button>
            </StickyFormActions>
          </form>
        )}
    </section>
  );
}
