import { useEffect, useRef, useState } from "react";

/** Stable assignment: auth UUID is random at signup, so each account receives one of ten variants. */
export function assignedAvatarIndex(userId: string): number {
  let h = 2166136261;
  for (const char of userId) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return (h >>> 0) % 10;
}

const FISH = [
  "M12 53 Q37 16 79 32 L93 20 L87 45 L94 68 L78 57 Q34 87 12 53 Z",
  "M8 50 Q36 32 73 35 L94 18 L86 49 L95 81 L71 61 Q30 71 8 50 Z",
  "M12 54 Q38 26 79 35 L95 29 L85 53 L93 72 L76 60 Q40 82 12 54 Z",
  "M11 52 Q36 21 75 34 L91 15 L87 50 L96 82 L74 64 Q32 76 11 52 Z",
  "M9 53 Q30 27 75 30 L93 19 L85 52 L96 74 L73 66 Q33 83 9 53 Z",
  "M10 54 Q36 28 74 35 L92 20 L86 50 L95 75 L73 64 Q37 72 10 54 Z",
  "M13 50 Q32 19 78 29 L94 14 L86 49 L95 81 L76 60 Q40 75 13 50 Z",
  "M11 48 Q29 29 76 33 L95 20 L85 51 L94 78 L75 61 Q35 72 11 48 Z",
  "M9 52 Q35 18 80 32 L94 21 L86 50 L94 77 L78 64 Q29 82 9 52 Z",
  "M12 53 Q33 23 76 34 L94 19 L86 51 L94 78 L76 64 Q34 76 12 53 Z",
] as const;
const LABELS = ["Хищник", "Щука", "Судак", "Окунь", "Сом", "Речной", "Охотник", "Приманка", "Глубина", "Спот"];

export function DefaultFishingAvatar({ userId, className = "" }: { userId: string; className?: string }) {
  const i = assignedAvatarIndex(userId);
  const paintId = "fish-avatar-" + i;
  return <svg role="img" aria-label={`Системный аватар: ${LABELS[i]}`} viewBox="0 0 100 100" className={className}>
    <defs><linearGradient id={paintId} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#A99AD9"/><stop offset="0.55" stopColor="#24283B"/><stop offset="1" stopColor="#D7FF35"/></linearGradient></defs>
    <circle cx="50" cy="50" r="49" fill="#070B10" stroke="#D7FF35" strokeWidth="2"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="#A99AD9" strokeOpacity=".3"/>
    <path d={FISH[i]} fill={`url(#${paintId})`} stroke="#D7FF35" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M30 52 Q48 39 70 46 M34 60 Q54 48 73 56" fill="none" stroke="#070B10" strokeWidth="3" strokeLinecap="round"/>
    <circle cx={i % 2 ? 28 : 30} cy="47" r="3.5" fill="#D7FF35"/>
    <path d="M15 83 Q50 67 87 83" fill="none" stroke="#A99AD9" strokeWidth="2" strokeOpacity=".65"/>
    <text x="50" y="94" textAnchor="middle" fill="#D7FF35" fontSize="6" fontWeight="900" letterSpacing="1">ZAPRUDA {String(i+1).padStart(2,"0")}</text>
  </svg>;
}

type Props = { file: File; saving: boolean; onClose: () => void; onSave: (file: File) => Promise<void> };
export function AvatarCropEditor({ file, saving, onClose, onSave }: Props) {
  const [src, setSrc] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const dragging = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setSrc(u); setZoom(1); setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(u);
  }, [file]);
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);
  const size = 280;
  const baseScale = image ? Math.max(size / image.naturalWidth, size / image.naturalHeight) : 1;
  const w = image ? image.naturalWidth * baseScale * zoom : size;
  const h = image ? image.naturalHeight * baseScale * zoom : size;
  const clamp = (x: number, y: number, z = zoom) => {
    if (!image) return { x: 0, y: 0 };
    const nw = image.naturalWidth * baseScale * z, nh = image.naturalHeight * baseScale * z;
    return { x: Math.max((size-nw)/2, Math.min((nw-size)/2, x)), y: Math.max((size-nh)/2, Math.min((nh-size)/2, y)) };
  };
  async function save() {
    if (!image || saving) return;
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, (size / 2 - w / 2 + offset.x) * 512 / size, (size / 2 - h / 2 + offset.y) * 512 / size, w * 512 / size, h * 512 / size);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", .9));
    if (blob) await onSave(new File([blob], "avatar.webp", { type: "image/webp" }));
  }
  return <div role="dialog" aria-modal="true" aria-label="Редактор аватара" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4">
    <div className="w-full max-w-sm rounded-3xl border border-[#D7FF35]/40 bg-[#101510] p-5 shadow-2xl">
      <h2 className="mb-3 text-lg font-black uppercase text-white">Настроить аватар</h2>
      <p className="mb-4 text-xs text-zinc-400">Перетаскивай фото пальцем или мышкой. Масштабируй ползунком.</p>
      <div className="relative mx-auto touch-none overflow-hidden rounded-full border-[3px] border-[#D7FF35]" style={{ width: size, height: size }}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); dragging.current = { x: e.clientX, y: e.clientY, originX: offset.x, originY: offset.y }; }}
        onPointerMove={e => { if (dragging.current) setOffset(clamp(dragging.current.originX + e.clientX - dragging.current.x, dragging.current.originY + e.clientY - dragging.current.y)); }}
        onPointerUp={() => { dragging.current = null; }}
        onPointerCancel={() => { dragging.current = null; }}>
        {src && <img src={src} alt="Предпросмотр кадрирования" draggable={false} className="absolute max-w-none select-none" style={{ width:w, height:h, left:size/2-w/2+offset.x, top:size/2-h/2+offset.y }} />}
      </div>
      <label className="mt-5 block text-xs font-bold text-[#D7FF35]">Масштаб: {Math.round(zoom*100)}%
        <input className="mt-2 w-full accent-[#D7FF35]" type="range" min="1" max="3" step=".01" value={zoom}
          onChange={e => { const z=Number(e.target.value); setZoom(z); setOffset(clamp(offset.x,offset.y,z)); }} />
      </label>
      <div className="mt-5 flex gap-3">
        <button type="button" disabled={saving} onClick={onClose} className="flex-1 rounded-xl border border-white/20 p-3 text-white">Отмена</button>
        <button type="button" disabled={saving || !image} onClick={() => { void save(); }} className="flex-1 rounded-xl bg-[#D7FF35] p-3 font-bold text-[#070B10]">{saving ? "Сохраняем…" : "Сохранить"}</button>
      </div>
    </div>
  </div>;
}
