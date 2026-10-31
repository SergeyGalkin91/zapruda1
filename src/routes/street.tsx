import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Clock3, Fish, MapPin, Plus, RotateCcw, ShieldCheck, Square } from "lucide-react";
import { Shell } from "@/components/Shell";

type StreetCatch = { species: string; note: string; at: string };
type StreetSession = { startedAt: string; area: string; notes: string; catches: StreetCatch[]; finishedAt?: string };
const STORAGE_KEY = "zapruda:street-session:v1";

export const Route = createFileRoute("/street")({
  head: () => ({ meta: [
    { title: "ZAPRUDA STREET — городская рыбалка" },
    { name: "description", content: "Street Fishing: городская сессия, уловы и приватный дневник рыбалки." },
  ] }),
  component: StreetPage,
});

function readSaved(): StreetSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("startedAt" in value) || typeof value.startedAt !== "string" || !Number.isFinite(Date.parse(value.startedAt))) return null;
    const session = value as StreetSession;
    return { startedAt: session.startedAt, area: typeof session.area === "string" ? session.area : "", notes: typeof session.notes === "string" ? session.notes : "", catches: Array.isArray(session.catches) ? session.catches.filter(c => c && typeof c.species === "string" && typeof c.at === "string").slice(0, 100) : [], finishedAt: typeof session.finishedAt === "string" ? session.finishedAt : undefined };
  } catch { return null; }
}

function StreetPage() {
  const [session, setSession] = useState<StreetSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [area, setArea] = useState("");
  const [species, setSpecies] = useState("");
  const [catchNote, setCatchNote] = useState("");

  useEffect(() => { const saved = readSaved(); if (saved) { setSession(saved); setArea(saved.area); } setLoaded(true); }, []);
  function store(next: StreetSession | null) {
    setSession(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch { /* Storage can be disabled; in-memory state still works. */ }
  }
  function start() {
    if (session) return;
    store({ startedAt: new Date().toISOString(), area: area.trim().slice(0, 100), notes: "", catches: [] });
  }
  function addCatch() {
    if (!session || session.finishedAt || !species.trim() || session.catches.length >= 100) return;
    store({ ...session, catches: [...session.catches, { species: species.trim().slice(0, 80), note: catchNote.trim().slice(0, 300), at: new Date().toISOString() }] });
    setSpecies(""); setCatchNote("");
  }
  function finish() { if (session && !session.finishedAt) store({ ...session, finishedAt: new Date().toISOString() }); }
  const elapsedMinutes = session ? Math.max(0, Math.floor(((session.finishedAt ? Date.parse(session.finishedAt) : Date.now()) - Date.parse(session.startedAt)) / 60000)) : 0;

  return <Shell>
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-[#D7FF35]/30 bg-[radial-gradient(circle_at_85%_15%,#283721_0%,#101713_36%,#080B0C_75%)] p-5 sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.23em] text-[#D7FF35]">ZAPRUDA COMMUNITY / URBAN FISHING</p>
        <h1 className="mt-4 text-[clamp(2.8rem,8vw,5.5rem)] font-black uppercase leading-none tracking-[-0.075em] text-white">STREET<span className="block text-[#D7FF35]">FISHING.</span></h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[#B9C1B6]">Город — твоя акватория. Записывай выходы и уловы, не раскрывая точные места.</p>
        <div className="mt-5 flex items-center gap-2 text-xs text-[#B2C5A3]"><ShieldCheck className="size-4 text-[#D7FF35]" /> Сессия хранится только в этом браузере, без GPS и публичной публикации</div>
      </section>

      {!loaded ? <p className="text-sm text-zinc-400">Загрузка сохранённой сессии…</p> :
      !session ? <section className="rounded-3xl border border-white/10 bg-[#10141A] p-5 sm:p-7">
        <div className="flex items-center gap-2 text-[#D7FF35]"><MapPin className="size-5" /><h2 className="text-lg font-black uppercase text-white">Новая Street-сессия</h2></div>
        <p className="mt-2 text-sm text-zinc-400">Укажи только город или район. Точный спот не нужен.</p>
        <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-zinc-300">Город / район (необязательно)
          <input className="field mt-2 w-full" value={area} maxLength={100} onChange={e=>setArea(e.target.value)} placeholder="Например, Нижний Новгород · набережная" />
        </label>
        <button type="button" onClick={start} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#D7FF35] px-5 font-black text-[#0B100C]"><Plus className="size-5" /> Начать сессию</button>
      </section> :
      <section className="space-y-5 rounded-3xl border border-[#323A32] bg-[#10141A] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-black uppercase text-white">{session.finishedAt ? "Сессия завершена" : "Ты на воде"}</h2><p className="mt-1 text-xs text-zinc-400">{session.area || "Город не указан"} · {new Date(session.startedAt).toLocaleString("ru-RU")}</p></div>
          <span className="flex items-center gap-1.5 rounded-full border border-[#D7FF35]/30 px-3 py-2 text-sm text-[#D7FF35]"><Clock3 className="size-4" /> {elapsedMinutes} мин</span>
        </div>
        <p className="text-sm text-zinc-300">Уловов за сессию: <strong className="text-[#D7FF35]">{session.catches.length}</strong></p>
        {!session.finishedAt && <form onSubmit={e=>{e.preventDefault();addCatch();}} className="space-y-3 rounded-2xl border border-white/10 bg-[#090D10] p-4">
          <h3 className="flex items-center gap-2 font-black text-white"><Fish className="size-5 text-[#D7FF35]" /> Записать улов</h3>
          <input className="field w-full" required maxLength={80} value={species} onChange={e=>setSpecies(e.target.value)} placeholder="Вид рыбы, например окунь" aria-label="Вид пойманной рыбы" />
          <input className="field w-full" maxLength={300} value={catchNote} onChange={e=>setCatchNote(e.target.value)} placeholder="Приманка, размер, заметка (необязательно)" aria-label="Заметка об улове" />
          <button type="submit" disabled={!species.trim() || session.catches.length >= 100} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D7FF35] px-4 font-black text-black disabled:opacity-40"><Plus className="size-4" /> Добавить улов</button>
        </form>}
        <label className="block text-xs font-bold uppercase tracking-wide text-zinc-300">Заметки о выходе
          <textarea className="field mt-2 min-h-24 w-full resize-y" maxLength={1000} value={session.notes} disabled={!!session.finishedAt} onChange={e=>store({...session,notes:e.target.value.slice(0,1000)})} placeholder="Условия, проводка, наблюдения — только для тебя" />
        </label>
        {session.catches.length > 0 && <div className="space-y-2" aria-label="Уловы сессии">{session.catches.map((c,i)=><div key={i} className="rounded-xl border border-white/10 bg-[#151B1E] p-3"><span className="font-bold text-white">{i+1}. {c.species}</span><span className="ml-2 text-xs text-zinc-400">{new Date(c.at).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</span>{c.note && <p className="mt-1 text-xs text-zinc-400">{c.note}</p>}</div>)}</div>}
        {!session.finishedAt ? <button type="button" onClick={finish} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7FF35]/50 px-4 font-bold text-[#D7FF35]"><Square className="size-4" /> Завершить сессию</button> :
          <div className="flex flex-wrap gap-3"><Link to="/reports/new" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D7FF35] px-4 font-black text-black">Оформить отчёт <ArrowRight className="size-4" /></Link><button type="button" onClick={()=>{if(!window.confirm("Текущая Street-сессия будет удалена с этого устройства. Продолжить?"))return;store(null);setArea("");}} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm text-white"><RotateCcw className="size-4" /> Новая сессия</button></div>}
        <p className="text-xs leading-5 text-zinc-500">Запись локальная: после перехода к отчёту данные автоматически не переносятся. Если очистить данные браузера, сессия исчезнет. Для публикации используй существующую форму отчёта.</p>
      </section>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/partners" className="rounded-2xl border border-white/10 bg-[#121816] p-5 text-white transition hover:border-[#D7FF35]/60"><span className="block text-lg font-black">STREET CREW</span><span className="mt-1 block text-sm text-zinc-400">Найти компанию на городской выход</span></Link>
        <Link to="/chat" search={{place:"",topic:"waters",country:""}} className="rounded-2xl border border-white/10 bg-[#121816] p-5 text-white transition hover:border-[#D7FF35]/60"><span className="block text-lg font-black">СПОТЫ И ВОДА</span><span className="mt-1 block text-sm text-zinc-400">Обсудить городские участки с рыболовами</span></Link>
      </div>
    </div>
  </Shell>;
}
