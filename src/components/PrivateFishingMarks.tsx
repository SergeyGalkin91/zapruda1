import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { Activity, ExternalLink, MapPin, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InteractiveFishingMap } from "@/components/InteractiveFishingMap";

type Kind = "promising" | "snag" | "dropoff" | "hole" | "riffle" | "other";
type Mark = {
  id: string;
  kind: Kind;
  title: string;
  note: string;
  latitude: number;
  longitude: number;
  created_at: string;
};
const labels: Record<Kind, string> = {
  promising: "🎣 Перспективная точка",
  snag: "🪵 Коряга",
  dropoff: "↘️ Бровка",
  hole: "🔵 Яма",
  riffle: "〰️ Перекат",
  other: "📍 Другое",
};
const kinds = Object.keys(labels) as Kind[];
const numberFromInput = (s: string) => Number(s.trim().replace(",", "."));

export function PrivateFishingMarks({ userId, homeCity, homeRegion }: { userId: string; homeCity?: string; homeRegion?: string }) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [selected, setSelected] = useState<Mark | null>(null);
  const [kind, setKind] = useState<Kind>("promising");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [draftPoint, setDraftPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { data, error: queryError } = await supabase.from("private_fishing_marks")
      .select("id,kind,title,note,latitude,longitude,created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    if (queryError) setError("Не удалось загрузить личные метки: " + queryError.message);
    else setMarks((data ?? []) as Mark[]);
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, [userId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");
    const lat = numberFromInput(latitude);
    const lon = numberFromInput(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) ||
        lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setError("Укажи координаты: широта от −90 до 90, долгота от −180 до 180.");
      return;
    }
    if (title.trim().length < 2) { setError("Добавь название точки."); return; }
    setSaving(true);
    const { data, error: insertError } = await supabase.from("private_fishing_marks").insert({
      user_id: userId, kind, title: title.trim(), note: note.trim(), latitude: lat, longitude: lon,
    }).select("id,kind,title,note,latitude,longitude,created_at").single();
    setSaving(false);
    if (insertError) { setError("Не удалось сохранить метку: " + insertError.message); return; }
    if (data) {
      setMarks((prev) => [data as Mark, ...prev].slice(0, 100));
      setSelected(data as Mark);
    }
    setTitle(""); setNote(""); setLatitude(""); setLongitude(""); setDraftPoint(null);
    setStatus("Точка сохранена только в твоём профиле.");
  }

  async function remove(mark: Mark) {
    if (!window.confirm("Удалить личную метку «" + mark.title + "»?")) return;
    setError(""); setStatus("");
    const { error: deleteError } = await supabase.from("private_fishing_marks")
      .delete().eq("id", mark.id).eq("user_id", userId);
    if (deleteError) { setError("Не удалось удалить метку: " + deleteError.message); return; }
    setMarks((prev) => prev.filter((item) => item.id !== mark.id));
    if (selected?.id === mark.id) setSelected(null);
    setStatus("Метка удалена.");
  }

  const coords = selected ? `${selected.longitude},${selected.latitude}` : "";
  const mapUrl = selected
    ? `https://yandex.ru/map-widget/v1/?ll=${encodeURIComponent(coords)}&z=14&pt=${encodeURIComponent(coords + ",pm2rdm")}`
    : null;
  const openUrl = selected ? `https://yandex.ru/maps/?ll=${encodeURIComponent(coords)}&z=14&pt=${encodeURIComponent(coords + ",pm2rdm")}` : null;

  return (
    <section aria-labelledby="private-fishing-marks" className="mb-7 rounded-[28px] border border-white/10 bg-[#0D110E] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] sm:p-7">
      <div className="flex items-start gap-3">
        <MapPin className="mt-1 size-6 shrink-0 text-[#D7FF35]" aria-hidden="true" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#D7FF35]">Личная карта · только для тебя</p>
          <h2 id="private-fishing-marks" className="mt-2 text-2xl font-black uppercase tracking-[-0.035em] text-white sm:text-3xl">Мои рыболовные метки</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Нажми на карту ниже, выбери тип точки и сохрани корягу, бровку, яму или перспективное место.
            Другие пользователи ZAPRUDA не видят твои метки. При открытии карты координаты передаются Яндексу.
          </p>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      {status && <p role="status" className="mt-4 text-sm text-[#D7FF35]">{status}</p>}
      <div className="mt-5"><InteractiveFishingMap
        homeCity={homeCity}
        homeRegion={homeRegion}
        marks={marks.map((mark) => ({ id: mark.id, title: mark.title, kind: mark.kind, latitude: mark.latitude, longitude: mark.longitude }))}
        selected={draftPoint}
        onPick={(point) => {
          setDraftPoint(point);
          setLatitude(point.latitude.toFixed(6));
          setLongitude(point.longitude.toFixed(6));
          setError("");
          setStatus("Точка выбрана. Укажи название и нажми «Сохранить личную метку».");
        }}
        onSelectMark={(id) => {
          const mark = marks.find((item) => item.id === id);
          if (mark) { setSelected(mark); setStatus("Выбрана сохранённая метка «" + mark.title + "»."); }
        }}
      /></div>
      <form onSubmit={save} className="mt-5 grid gap-3 rounded-[22px] border border-white/10 bg-[#171C17] p-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-zinc-300">Тип метки
          <select className="field mt-1 w-full" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            {kinds.map((code) => <option key={code} value={code}>{labels[code]}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-zinc-300">Название *
          <input className="field mt-1 w-full" required minLength={2} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, коряжник у берега" />
        </label>
        <label className="text-xs font-semibold text-zinc-300">Широта *
          <input className="field mt-1 w-full" required inputMode="decimal" value={latitude} onChange={(e) => { setLatitude(e.target.value); setDraftPoint(null); }} placeholder="56.247551" />
        </label>
        <label className="text-xs font-semibold text-zinc-300">Долгота *
          <input className="field mt-1 w-full" required inputMode="decimal" value={longitude} onChange={(e) => { setLongitude(e.target.value); setDraftPoint(null); }} placeholder="43.949333" />
        </label>
        <label className="text-xs font-semibold text-zinc-300 sm:col-span-2">Заметка о точке
          <textarea className="field mt-1 min-h-20 w-full" maxLength={700} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Глубина, приманка, зацепы, вид рыбы…" />
        </label>
        <button className="btn-primary justify-center sm:col-span-2" disabled={saving} type="submit">
          <Plus className="size-4" /> {saving ? "Сохраняем…" : "Сохранить личную метку"}
        </button>
      </form>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-2">
          {loading && <p className="text-sm text-zinc-400">Загружаем метки…</p>}
          {!loading && !marks.length && <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-400">Пока нет меток. Добавь первую перспективную точку.</p>}
          {marks.map((mark) => (
            <div key={mark.id} className={`flex items-start gap-2 rounded-xl border p-3 ${selected?.id === mark.id ? "border-[#D7FF35]/60 bg-[#D7FF35]/5" : "border-white/10"}`}>
              <button type="button" onClick={() => setSelected(mark)} className="min-w-0 flex-1 text-left">
                <span className="block text-xs font-semibold text-[#D7FF35]">{labels[mark.kind]}</span>
                <span className="mt-1 block break-words text-sm font-bold text-white">{mark.title}</span>
                <span className="mt-1 block text-xs text-zinc-400">{mark.latitude.toFixed(6)}, {mark.longitude.toFixed(6)}</span>
                {mark.note && <span className="mt-1 block whitespace-pre-wrap break-words text-xs text-zinc-400">{mark.note}</span>}
              </button>
              <Link to="/analytics" search={{ mark: mark.id }} title={"Анализировать метку «" + mark.title + "» (VIP Beta)"} className="rounded-lg p-2 text-[#D7FF35] hover:bg-[#D7FF35]/10" aria-label={"Аналитика выбранной точки " + mark.title}><Activity className="size-4" /></Link>
              <Link to="/messages" search={{ mark: mark.id }} title={"Поделиться меткой " + mark.title + " в личной переписке"} className="rounded-lg p-2 text-[#D7FF35] hover:bg-[#D7FF35]/10" aria-label={"Поделиться точкой " + mark.title}><ExternalLink className="size-4" /></Link>
              <button type="button" onClick={() => void remove(mark)} aria-label={"Удалить метку " + mark.title} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
        <div>
          {selected && mapUrl ? (
            <div className="overflow-hidden rounded-[24px] border border-[#A78BFA]/25 bg-[#101210]">
              <div className="relative">
                <iframe key={selected.id} title={"Карта: " + selected.title} src={mapUrl} loading="lazy" className="h-[230px] w-full border-0" referrerPolicy="strict-origin-when-cross-origin" />
                <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-[#D7FF35]/40 bg-[#0A0D09]/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#D7FF35]">ZAPRUDA / SPOT</span>
              </div>
              <div className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A78BFA]">{labels[selected.kind]}</p>
                    <h3 className="mt-1 text-xl font-black uppercase leading-tight tracking-tight text-white">{selected.title}</h3>
                  </div>
                  <MapPin className="size-6 shrink-0 text-[#D7FF35]" aria-hidden="true" />
                </div>
                {selected.note && <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{selected.note}</p>}
                <p className="font-mono text-[11px] text-zinc-400">{selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}</p>
                {openUrl && <a className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D7FF35] px-5 py-3 text-xs font-black uppercase tracking-wide text-black transition hover:bg-white" href={openUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /> Открыть на карте</a>}
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-white/15 text-center text-sm text-zinc-500">Выбери метку, чтобы посмотреть её на карте.</div>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-400">Рядом с меткой есть «Аналитика Beta» для VIP и отдельная кнопка отправки в личный чат. Координаты передаются ИИ только после твоего подтверждения и не публикуются автоматически.</p>
    </section>
  );
}
