import { useEffect, useRef, useState } from "react";
import { Clock3, MapPinned, Pause, Play, Square, Download, Share2 } from "lucide-react";

type Point = { lat: number; lon: number; time: number; accuracy: number };
type Trip = { id: number; start: number; activeMs: number; runningSince: number | null; points: Point[]; distanceM: number; ended?: number };
type Stored = { active: Trip | null; history: Trip[] };
const key = (userId: string) => "zapruda.trip-tracker.v1." + userId;
const empty: Stored = { active: null, history: [] };
const elapsed = (t: Trip, now: number) => t.activeMs + (t.runningSince === null ? 0 : Math.max(0, now - t.runningSince));
const duration = (ms: number) => { const n = Math.floor(ms / 60000); return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; };
function distance(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function gpx(trip: Trip) {
  const safe = (n: number) => n.toFixed(7);
  const points = trip.points.map(p => `<trkpt lat="${safe(p.lat)}" lon="${safe(p.lon)}"><time>${new Date(p.time).toISOString()}</time></trkpt>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="ZAPRUDA" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>ZAPRUDA fishing trip</name><trkseg>${points}</trkseg></trk></gpx>`;
}
function RoutePreview({ points }: { points: Point[] }) {
  if (points.length < 2) return <p className="text-sm text-zinc-400">Маршрут появится после получения двух точек GPS.</p>;
  const xs = points.map(p => p.lon), ys = points.map(p => p.lat);
  const x0 = Math.min(...xs), xRange = Math.max(0.000001, Math.max(...xs) - x0);
  const y0 = Math.min(...ys), yRange = Math.max(0.000001, Math.max(...ys) - y0);
  const polyline = points.map(p => `${12 + (p.lon - x0) / xRange * 296},${168 - (p.lat - y0) / yRange * 156}`).join(" ");
  return <svg viewBox="0 0 320 180" role="img" aria-label="Схема пройденного маршрута, север сверху" className="w-full rounded-xl border border-white/10 bg-[#0B170E]">
    <path d="M0 45H320 M0 90H320 M0 135H320 M80 0V180 M160 0V180 M240 0V180" stroke="#ffffff16" fill="none"/>
    <polyline points={polyline} fill="none" stroke="#D7FF35" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx={Number(polyline.split(" ")[0].split(",")[0])} cy={Number(polyline.split(" ")[0].split(",")[1])} r="5" fill="#fff"/>
    <text x="304" y="18" textAnchor="end" fontSize="11" fill="#c7d3c0">С ↑</text>
  </svg>;
}
export function FishingSessionTracker({ userId }: { userId: string }) {
  const [data, setData] = useState<Stored>(empty);
  const [now, setNow] = useState(Date.now());
  const [gpsError, setGpsError] = useState("");
  const watch = useRef<number | null>(null);
  const dataRef = useRef<Stored>(empty);
  const persist = (next: Stored) => {
    dataRef.current = next;
    setData(next);
    try { localStorage.setItem(key(userId), JSON.stringify(next)); } catch { /* storage may be blocked */ }
  };
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key(userId)) || "null") as Stored | null;
      const parsed = raw && Array.isArray(raw.history) ? { active: raw.active ?? null, history: raw.history.slice(0, 40) } : empty;
      dataRef.current = parsed; setData(parsed);
    } catch { dataRef.current = empty; setData(empty); }
    return () => { if (watch.current !== null) navigator.geolocation?.clearWatch(watch.current); watch.current = null; };
  }, [userId]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!data.active || data.active.runningSince === null || !navigator.geolocation || watch.current !== null) return;
    if (!window.isSecureContext) { setGpsError("GPS доступен только через HTTPS или localhost."); return; }
    watch.current = navigator.geolocation.watchPosition(position => {
      const { latitude: lat, longitude: lon, accuracy } = position.coords;
      if (![lat, lon, accuracy].every(Number.isFinite) || accuracy > 80) return;
      const p: Point = { lat, lon, accuracy, time: position.timestamp || Date.now() };
      const state = dataRef.current, trip = state.active;
      if (!trip || trip.runningSince === null) return;
      const previous = trip.points.at(-1);
      if (previous) {
        const meters = distance(previous, p);
        const seconds = (p.time - previous.time) / 1000;
        if (seconds <= 0 || meters < 8 || meters / seconds > 7 || trip.points.length >= 2000) return;
        persist({ ...state, active: { ...trip, points: [...trip.points, p], distanceM: trip.distanceM + meters } });
      } else persist({ ...state, active: { ...trip, points: [p] } });
      setGpsError("");
    }, err => setGpsError("GPS: " + err.message), { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    return () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); watch.current = null; };
  }, [data.active?.id, data.active?.runningSince, userId]);
  const active = data.active;
  const start = () => { const time = Date.now(); setGpsError(""); persist({ ...dataRef.current, active: { id: time, start: time, activeMs: 0, runningSince: time, points: [], distanceM: 0 } }); };
  const pause = () => { const t = dataRef.current.active; if (!t) return; persist({ ...dataRef.current, active: { ...t, activeMs: elapsed(t, Date.now()), runningSince: null } }); };
  const resume = () => { const t = dataRef.current.active; if (t) persist({ ...dataRef.current, active: { ...t, runningSince: Date.now() } }); };
  const finish = () => { const t = dataRef.current.active; if (!t) return; persist({ active: null, history: [{ ...t, activeMs: elapsed(t, Date.now()), runningSince: null, ended: Date.now() }, ...dataRef.current.history].slice(0, 40) }); };
  const exportTrip = async (t: Trip, share: boolean) => {
    const file = new File([gpx(t)], `zapruda-${new Date(t.start).toISOString().slice(0, 10)}.gpx`, { type: "application/gpx+xml" });
    if (share && navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Мой маршрут рыбалки — ZAPRUDA" }); return; } catch { /* allow download fallback */ }
    }
    const url = URL.createObjectURL(file), link = document.createElement("a");
    link.href = url; link.download = file.name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const trip = active ?? data.history[0];
  return <section className="mb-7 rounded-3xl border border-[#D7FF35]/25 bg-[#151915] p-5 sm:p-7">
    <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#D7FF35]">ZAPRUDA / НА ВОДОЁМЕ</p>
    <h2 className="mt-2 flex items-center gap-2 text-xl font-bold"><Clock3 className="size-5 text-[#D7FF35]"/> Трекер рыбалки</h2>
    <p className="mt-2 text-sm leading-6 text-zinc-400">Время ловли и пройденная дистанция. GPS включается только во время сессии с твоего разрешения.</p>
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="font-mono text-3xl font-bold tabular-nums text-[#D7FF35]">{active ? duration(elapsed(active, now)) : "00:00"}</p><p className="text-xs text-zinc-400">Часы : минуты</p></div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="font-mono text-3xl font-bold tabular-nums">{(active?.distanceM ?? 0) / 1000 < 10 ? ((active?.distanceM ?? 0) / 1000).toFixed(2) : ((active?.distanceM ?? 0) / 1000).toFixed(1)} км</p><p className="text-xs text-zinc-400">Пройдено по GPS</p></div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {!active && <button type="button" className="btn-primary" onClick={start}><Play className="size-4"/> Начать рыбалку</button>}
      {active?.runningSince !== null && active && <button type="button" className="btn-ghost" onClick={pause}><Pause className="size-4"/> Пауза</button>}
      {active?.runningSince === null && active && <button type="button" className="btn-primary" onClick={resume}><Play className="size-4"/> Продолжить</button>}
      {active && <button type="button" className="btn-ghost" onClick={finish}><Square className="size-4"/> Завершить</button>}
    </div>
    {gpsError && <p role="status" className="mt-3 text-xs text-amber-200">{gpsError}. Таймер продолжает работать.</p>}
    {trip && <div className="mt-5 space-y-3">
      <h3 className="flex items-center gap-2 font-bold"><MapPinned className="size-4 text-[#D7FF35]"/> {active ? "Текущий трек" : "Последний завершённый трек"}</h3>
      <RoutePreview points={trip.points}/>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost text-xs" disabled={!trip.points.length} onClick={() => void exportTrip(trip, false)}><Download className="size-4"/> Скачать GPX</button>
        <button type="button" className="btn-ghost text-xs" disabled={!trip.points.length} onClick={() => void exportTrip(trip, true)}><Share2 className="size-4"/> Поделиться маршрутом</button>
      </div>
    </div>}
    <p className="mt-4 text-xs leading-5 text-zinc-500">Локальный журнал: {data.history.length} завершённых сессий, {duration(data.history.reduce((sum, t) => sum + Math.min(t.activeMs, 86400000), 0))} всего. На этом устройстве, без серверного подтверждения и без начисления официальных ачивок. При закрытии вкладки GPS-запись приостанавливается браузером; для фоновой записи и часов потребуется мобильное приложение. Перед отправкой GPX убедись, что маршрут не раскрывает секретные точки.</p>
  </section>;
}
