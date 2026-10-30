import { useEffect, useRef, useState } from "react";
import { getKey, loadYandex, type YandexApi } from "@/components/InteractiveFishingMap";
import { Clock3, MapPinned, Download, Share2 } from "lucide-react";

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
function FishingRouteMap({ points }: { points: Point[] }) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<InstanceType<YandexApi["Map"]> | null>(null);
  const api = useRef<YandexApi | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const key = getKey();
  const canMap = points.length >= 2;
  useEffect(() => {
    if (!key || !canMap || !holder.current) return;
    let active = true;
    void loadYandex(key).then(ymaps => {
      if (!active || !holder.current) return;
      api.current = ymaps;
      map.current = new ymaps.Map(holder.current, { center: [points[0].lat, points[0].lon], zoom: 15, controls: ["zoomControl"] });
      setReady(true);
    }).catch(err => { if (active) setMapError(err instanceof Error ? err.message : "Карта недоступна"); });
    return () => { active = false; map.current?.destroy(); map.current = null; api.current = null; setReady(false); };
  // Map is initialized once when a route first gets enough points.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, canMap]);
  useEffect(() => {
    if (!ready || !map.current || !api.current) return;
    map.current.geoObjects.removeAll();
    const line = new api.current.Polyline(points.map(p => [p.lat, p.lon]), { hintContent: "Мой рыболовный маршрут" },
      { strokeColor: "#D7FF35", strokeWidth: 5, strokeOpacity: 0.9 });
    map.current.geoObjects.add(line);
  }, [points, ready]);
  return <div className="space-y-2">
    {key && canMap && <div ref={holder} className="h-64 w-full overflow-hidden rounded-xl border border-white/15 bg-[#0B170E] sm:h-80"
      aria-label="Маршрут рыбалки на Яндекс Картах" />}
    {(!ready || !key || !canMap) && <RoutePreview points={points}/>}
    {mapError && <p className="text-xs text-amber-200">Яндекс Карты: {mapError}. Показана схема маршрута.</p>}
    {key && ready && <p className="text-xs text-zinc-500">Маршрут показан на Яндекс Картах. Координаты передаются поставщику карты.</p>}
    {!key && canMap && <p className="text-xs text-zinc-500">Для отображения трека поверх Яндекс Карт нужен API-ключ в настройках разработчика. Пока показана схема.</p>}
  </div>;
}

export type FishingClockState = { id: string; started_at: string; running_since: string | null; active_seconds: number; status: "running" | "paused" | "finished" };
export function FishingSessionTracker({ userId, serverSession }: { userId: string; serverSession: FishingClockState | null }) {
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
    const syncVisibility = () => {
      const trip = dataRef.current.active;
      if (!trip) return;
      const foreground = document.visibilityState === "visible";
      if (!foreground && trip.runningSince !== null) {
        persist({ ...dataRef.current, active: { ...trip, activeMs: elapsed(trip, Date.now()), runningSince: null } });
      } else if (foreground && serverSession?.status === "running" && trip.runningSince === null) {
        persist({ ...dataRef.current, active: { ...trip, runningSince: Date.now() } });
      }
    };
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("pagehide", syncVisibility);
    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("pagehide", syncVisibility);
    };
  }, [serverSession?.status, userId]);

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
  useEffect(() => {
    const prev = dataRef.current.active;
    if (!serverSession) {
      if (prev) persist({ ...dataRef.current, active: null, history: [{ ...prev, activeMs: elapsed(prev, Date.now()), runningSince: null, ended: Date.now() }, ...dataRef.current.history].slice(0, 40) });
      return;
    }
    const id = new Date(serverSession.started_at).getTime();
    if (prev?.id !== id) {
      const archived = prev
        ? [{ ...prev, activeMs: elapsed(prev, Date.now()), runningSince: null, ended: Date.now() }, ...dataRef.current.history].slice(0, 40)
        : dataRef.current.history;
      persist({ ...dataRef.current, history: archived, active: { id, start: id, activeMs: 0, runningSince: serverSession.status === "running" && document.visibilityState === "visible" ? Date.now() : null, points: [], distanceM: 0 } });
    } else if (prev.runningSince !== null && serverSession.status === "paused") {
      persist({ ...dataRef.current, active: { ...prev, activeMs: elapsed(prev, Date.now()), runningSince: null } });
    } else if (prev.runningSince === null && serverSession.status === "running" && document.visibilityState === "visible") {
      persist({ ...dataRef.current, active: { ...prev, runningSince: Date.now() } });
    }
  }, [serverSession?.id, serverSession?.status, userId]);
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
    <p className="mt-2 text-sm leading-6 text-zinc-400">GPS-маршрут серверной рыболовной сессии. Управление таймером находится выше.</p>
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="font-mono text-3xl font-bold tabular-nums text-[#D7FF35]">{active ? duration(elapsed(active, now)) : "00:00"}</p><p className="text-xs text-zinc-400">Часы : минуты</p></div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="font-mono text-3xl font-bold tabular-nums">{(active?.distanceM ?? 0) / 1000 < 10 ? ((active?.distanceM ?? 0) / 1000).toFixed(2) : ((active?.distanceM ?? 0) / 1000).toFixed(1)} км</p><p className="text-xs text-zinc-400">Пройдено по GPS</p></div>
    </div>
    {gpsError && <p role="status" className="mt-3 text-xs text-amber-200">{gpsError}. Таймер продолжает работать.</p>}
    {trip && <div className="mt-5 space-y-3">
      <h3 className="flex items-center gap-2 font-bold"><MapPinned className="size-4 text-[#D7FF35]"/> {active ? "Текущий трек" : "Последний завершённый трек"}</h3>
      <FishingRouteMap points={trip.points}/>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost text-xs" disabled={!trip.points.length} onClick={() => void exportTrip(trip, false)}><Download className="size-4"/> Скачать GPX</button>
        <button type="button" className="btn-ghost text-xs" disabled={!trip.points.length} onClick={() => void exportTrip(trip, true)}><Share2 className="size-4"/> Поделиться маршрутом</button>
      </div>
    </div>}
    <p className="mt-4 text-xs leading-5 text-zinc-500">Локальный журнал: {data.history.length} завершённых сессий, {duration(data.history.reduce((sum, t) => sum + Math.min(t.activeMs, 86400000), 0))} всего. На этом устройстве, без серверного подтверждения и без начисления официальных ачивок. При сворачивании вкладки GPS-запись приостанавливается и возобновляется при возвращении. Серверный таймер продолжает идти, пока ты не нажмёшь «Пауза». Для фоновой записи и часов потребуется мобильное приложение. Перед отправкой GPX убедись, что маршрут не раскрывает секретные точки.</p>
  </section>;
}
