import { useEffect, useRef, useState } from "react";

type Point = { latitude: number; longitude: number };
type DisplayMark = Point & { id: string; title: string; kind: string };
type LeafletMarker = { addTo(map: LeafletMap): LeafletMarker; on(name: string, callback: () => void): void; remove(): void; bindTooltip(text: string): LeafletMarker };
type LeafletMap = { on(name: string, callback: (event: { latlng: { lat: number; lng: number } }) => void): void; remove(): void; setView(center: number[], zoom: number): void };
type LeafletApi = {
  map(element: HTMLElement, options: { center: number[]; zoom: number; zoomControl: boolean }): LeafletMap;
  tileLayer(url: string, options: { attribution: string; maxZoom: number }): { addTo(map: LeafletMap): void };
  marker(coords: number[], options?: { icon?: unknown }): LeafletMarker;
  divIcon(options: { className: string; html: string; iconSize: number[]; iconAnchor: number[] }): unknown;
};
declare global { interface Window { L?: LeafletApi } }

let loading: Promise<LeafletApi> | null = null;
function loadLeaflet(): Promise<LeafletApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser required"));
  if (window.L) return Promise.resolve(window.L);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-zapruda-leaflet]')) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        css.crossOrigin = "anonymous";
        css.dataset.zaprudaLeaflet = "true";
        document.head.appendChild(css);
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
      script.crossOrigin = "anonymous";
      script.onload = () => window.L ? resolve(window.L) : reject(new Error("Map library unavailable"));
      script.onerror = () => reject(new Error("Map library blocked by browser or network"));
      document.head.appendChild(script);
    }).catch((error) => { loading = null; throw error; });
  }
  return loading;
}

type Props = {
  marks: DisplayMark[];
  selected: Point | null;
  onPick: (point: Point) => void;
  onSelectMark: (id: string) => void;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] ?? c));

export function InteractiveFishingMap({ marks, selected, onPick, onSelectMark }: Props) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const lib = useRef<LeafletApi | null>(null);
  const markers = useRef<LeafletMarker[]>([]);
  const onPickRef = useRef(onPick);
  const onSelectRef = useRef(onSelectMark);
  const [problem, setProblem] = useState("");
  const [ready, setReady] = useState(false);
  onPickRef.current = onPick;
  onSelectRef.current = onSelectMark;

  useEffect(() => {
    let active = true;
    void loadLeaflet().then((L) => {
      if (!active || !node.current) return;
      lib.current = L;
      const start = marks[0] ?? selected;
      const mapInstance = L.map(node.current, {
        center: start ? [start.latitude, start.longitude] : [55.75, 37.62],
        zoom: start ? 13 : 5,
        zoomControl: true,
      });
      map.current = mapInstance;
      setReady(true);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapInstance);
      mapInstance.on("click", ({ latlng }) => {
        onPickRef.current({ latitude: Number(latlng.lat.toFixed(6)), longitude: Number(latlng.lng.toFixed(6)) });
      });
    }).catch(() => { if (active) setProblem("Интерактивная карта недоступна в этой сети. Координаты можно ввести вручную."); });
    return () => {
      active = false;
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
      lib.current = null;
    };
  }, []);

  useEffect(() => {
    const L = lib.current, instance = map.current;
    if (!L || !instance) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    for (const mark of marks) {
      const icon = L.divIcon({
        className: "zapruda-map-pin",
        html: '<span style="display:grid;place-items:center;width:28px;height:28px;border:2px solid #D7FF35;border-radius:50%;background:#17230d;color:#D7FF35;font-size:15px;box-shadow:0 2px 12px #0008">●</span>',
        iconSize: [28, 28], iconAnchor: [14, 14],
      });
      const marker = L.marker([mark.latitude, mark.longitude], { icon }).addTo(instance).bindTooltip(esc(mark.title));
      marker.on("click", () => onSelectRef.current(mark.id));
      markers.current.push(marker);
    }
    if (selected) {
      const marker = L.marker([selected.latitude, selected.longitude]).addTo(instance);
      markers.current.push(marker);
    }
  }, [marks, selected, ready]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[#D7FF35]">Нажми на карту, чтобы поставить точку · масштабируй и перемещай её</p>
      <div ref={node} aria-label="Интерактивная карта для выбора рыболовной точки" className="relative z-0 h-[330px] w-full overflow-hidden rounded-xl border border-white/15 bg-[#202921] sm:h-[410px]" />
      {problem && <p role="status" className="text-xs text-amber-200">{problem}</p>}
      <p className="text-[11px] text-zinc-500">Интерактивная карта: OpenStreetMap / Leaflet. Сохранённые точки можно открывать в Яндекс Картах. Карта загружает тайлы стороннего сервиса.</p>
    </div>
  );
}
