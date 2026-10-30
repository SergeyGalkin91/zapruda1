import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Plus, UserPlus, Users, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Group = { id: string; name: string; description: string; city: string; owner_id: string };
type Member = { group_id: string; user_id: string; role: string; status: "pending" | "accepted" | "declined"; invited_by: string | null };
type Person = { id: string; username: string | null; display_name: string | null };
const db = supabase as any;
const name = (p: Person) => p.display_name || p.username || "Рыболов";

export function SocialGroups() {
  const [uid, setUid] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [newName, setNewName] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setUid(""); return; }
    const id = auth.user.id;
    setUid(id);
    const [g, m, p] = await Promise.all([
      db.from("social_groups").select("id,name,description,city,owner_id").order("created_at", { ascending: false }).limit(100),
      db.from("social_group_members").select("group_id,user_id,role,status,invited_by"),
      supabase.from("profiles").select("id,username,display_name").neq("id", id).limit(250),
    ]);
    const failure = [g.error,m.error,p.error].find(Boolean);
    if (failure) setError("Ошибка загрузки сообществ: " + failure.message);
    else setError("");
    setGroups((g.data ?? []) as Group[]);
    setMembers((m.data ?? []) as Member[]);
    setPeople((p.data ?? []) as Person[]);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase.channel("social-community-invitations")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_group_members" }, () => void refresh())
      .subscribe();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => { window.removeEventListener("focus", onFocus); void supabase.removeChannel(channel); };
  }, [refresh]);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!uid || busy || newName.trim().length < 3) return;
    setBusy(true); setError(""); setNotice("");
    const { data, error: ge } = await db.from("social_groups")
      .insert({ name: newName.trim(), description: description.trim(), city: city.trim(), owner_id: uid })
      .select("id").single();
    if (ge) { setError("Не удалось создать сообщество: " + ge.message); setBusy(false); return; }
    const { error: me } = await db.from("social_group_members")
      .insert({ group_id: data.id, user_id: uid, role: "owner", status: "accepted" });
    setBusy(false);
    if (me) setError("Сообщество создано, но не удалось подключить владельца: " + me.message);
    else {
      setNewName(""); setDescription(""); setCity(""); setGroupId(data.id);
      setNotice("Сообщество создано! Теперь пригласи участников.");
    }
    await refresh();
  }

  async function invite() {
    if (!uid || !groupId || !inviteId || busy) return;
    const group = groups.find(g => g.id === groupId);
    if (group?.owner_id !== uid) { setError("Только создатель сообщества может приглашать."); return; }
    setBusy(true); setError(""); setNotice("");
    const { error: e } = await db.from("social_group_members").insert({
      group_id: groupId, user_id: inviteId, role: "member", status: "pending", invited_by: uid,
    });
    setBusy(false);
    if (e) setError("Не удалось пригласить: " + e.message);
    else { setInviteId(""); setNotice("Приглашение отправлено. Участник должен принять его."); await refresh(); }
  }

  async function respond(m: Member, status: "accepted" | "declined") {
    if (busy || m.user_id !== uid) return;
    setBusy(true); setError("");
    const { error: e } = await db.from("social_group_members").update({ status })
      .eq("group_id", m.group_id).eq("user_id", uid);
    setBusy(false);
    if (e) setError("Не удалось обработать приглашение: " + e.message);
    else { setNotice(status === "accepted" ? "Ты вступил в сообщество." : "Приглашение отклонено."); await refresh(); }
  }

  const own = groups.filter(g => g.owner_id === uid);
  const accepted = groups.filter(g => members.some(m => m.group_id === g.id && m.user_id === uid && m.status === "accepted"));
  const pending = members.filter(m => m.user_id === uid && m.status === "pending");

  return <section className="mt-6 rounded-3xl border border-[#D7FF35]/20 bg-[#151915] p-5 sm:p-7">
    <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#D7FF35]">ZAPRUDA / СВОИ ЛЮДИ</p>
    <h2 className="mt-2 flex items-center gap-2 text-xl font-black"><Users className="size-6 text-[#D7FF35]" /> Рыболовные сообщества и приглашения</h2>
    <p className="mt-2 text-sm text-zinc-400">Создавай клуб по городу или интересам, приглашай других рыбаков. Вступление происходит только после их согласия.</p>
    {error && <p role="alert" className="my-3 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="my-3 text-sm text-[#D7FF35]">{notice}</p>}
    {!uid ? <p className="mt-4 text-sm text-zinc-400">Для создания и вступления <Link className="text-[#D7FF35] underline" to="/auth">войдите в аккаунт</Link>.</p> :
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="font-bold">Мои сообщества ({accepted.length})</h3>
          {accepted.map(g => <div key={g.id} className="rounded-xl border border-white/10 bg-black/10 p-3 text-sm">
            <p className="font-bold">{g.name}</p><p className="mt-1 text-xs text-zinc-400">{g.city || "Любой город"} · {g.description || "Без описания"}</p>
            <p className="mt-2 text-xs text-[#D7FF35]">Участников: {members.filter(m => m.group_id === g.id && m.status === "accepted").length}{g.owner_id === uid ? " · Ты администратор" : ""}</p>
          </div>)}
          {!accepted.length && <p className="text-sm text-zinc-500">Пока ни в одном клубе не состоишь.</p>}
          <h3 className="font-bold">Приглашения ({pending.length})</h3>
          {pending.map(m => <div key={m.group_id} className="rounded-xl border border-[#D7FF35]/20 p-3 text-sm">
            <p className="mb-2 font-semibold">{groups.find(g => g.id === m.group_id)?.name || "Рыболовный клуб"}</p>
            <div className="flex gap-2">
              <button className="btn-primary inline-flex" type="button" onClick={() => void respond(m,"accepted")} disabled={busy}><Check className="size-4"/> Вступить</button>
              <button className="btn-ghost inline-flex" type="button" onClick={() => void respond(m,"declined")} disabled={busy}><X className="size-4"/> Отклонить</button>
            </div>
          </div>)}
          {!pending.length && <p className="text-xs text-zinc-500">Нет ожидающих приглашений.</p>}
        </div>
        <div className="space-y-5">
          <form className="space-y-3 rounded-xl border border-white/10 bg-black/10 p-4" onSubmit={create}>
            <h3 className="font-bold">Создать сообщество</h3>
            <input className="field" minLength={3} maxLength={80} required placeholder="Название клуба" value={newName} onChange={e => setNewName(e.target.value)}/>
            <input className="field" maxLength={100} placeholder="Город (необязательно)" value={city} onChange={e => setCity(e.target.value)}/>
            <textarea className="field min-h-20" maxLength={500} placeholder="Описание и тематика" value={description} onChange={e => setDescription(e.target.value)}/>
            <button type="submit" disabled={busy || newName.trim().length < 3} className="btn-primary inline-flex"><Plus className="size-4"/> Создать клуб</button>
          </form>
          <div className="space-y-3 rounded-xl border border-white/10 bg-black/10 p-4">
            <h3 className="flex items-center gap-2 font-bold"><UserPlus className="size-4 text-[#D7FF35]"/> Пригласить в свой клуб</h3>
            <select aria-label="Выбрать свой клуб" className="field" value={groupId} onChange={e => setGroupId(e.target.value)}><option value="">Выбери клуб</option>{own.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            <select aria-label="Кого пригласить" className="field" value={inviteId} onChange={e => setInviteId(e.target.value)}><option value="">Выбери участника</option>{people.filter(p => !members.some(m => m.group_id === groupId && m.user_id === p.id)).map(p => <option key={p.id} value={p.id}>{name(p)}</option>)}</select>
            <button type="button" className="btn-primary inline-flex" disabled={!inviteId || !groupId || busy} onClick={() => void invite()}><UserPlus className="size-4"/> Отправить приглашение</button>
            <p className="text-xs text-zinc-500">После принятия приглашения участник появится в клубе. Для личного общения перейди в <Link to="/messages" search={{ mark: "" }} className="underline text-[#D7FF35]">сообщения</Link>.</p>
          </div>
        </div>
      </div>}
  </section>;
}
