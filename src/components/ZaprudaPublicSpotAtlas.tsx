import { useEffect, useMemo, useState } from "react";
import { MapPinned, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { approvedMapUrl, isApprovedPublicSpot, type PublicSpot } from "@/lib/approved-spot-map";

/** Public-only ZAPRUDA SPOT atlas. No user coordinates, no paid/private location lookups. */
export function ZaprudaPublicSpotAtlas() {
  const stagingOnly =
    import.meta.env["VITE_SUPABASE_URL"] === "https://yudtbifopfnjtjanaqrd.supabase.co" ||
    (typeof window !== "undefined" &&
      /^deploy-preview-[0-9]+--zapruda1[.]netlify[.]app$/.test(window.location.hostname));
  const [spots, setSpots] = useState<PublicSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!stagingOnly) return;
    let active = true;
    void supabase
      .from("zc_public_spots")
      .select(
        "id,name,city,region,waterbody_name,public_lat,public_lng,disciplines,state,reviewed_at",
      )
      .eq("state", "approved")
      .order("city")
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (!active) return;
        setSpots((data ?? []).filter(isApprovedPublicSpot));
        if (queryError) setError("Не удалось загрузить проверенные споты.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [stagingOnly]);

  const mapUrl = useMemo(() => approvedMapUrl(spots), [spots]);

  if (!stagingOnly) return null;

  return (
    <section
      aria-labelledby="zc-approved-spots-heading"
      className="mt-8 rounded-3xl border border-white/10 bg-[#0B0D12] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-[#D7FF35]">
            <MapPinned className="size-4" aria-hidden="true" /> ZAPRUDA SPOT
          </p>
          <h2 id="zc-approved-spots-heading" className="mt-2 text-xl font-black text-white">
            Проверенные публичные споты
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Здесь появляются только точки, одобренные модератором. Приватные места и карты SPOT
            MARKET не публикуются.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#D7FF35]/30 px-3 py-1 text-xs text-[#D7FF35]">
          <ShieldCheck className="size-4" aria-hidden="true" /> {spots.length} проверено
        </span>
      </div>

      {loading && (
        <p className="mt-5 text-sm text-zinc-400" role="status">
          Проверяем каталог…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-5 text-sm text-red-300">
          {error}
        </p>
      )}
      {!loading && !error && !spots.length && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-300">
          Пока нет опубликованных проверенных спотов. Кандидаты из 20 городов не показываются как
          подтверждённые точки.
        </div>
      )}
      {!loading && !error && mapUrl && (
        <>
          <iframe
            title="Карта проверенных публичных спотов ZAPRUDA"
            src={mapUrl}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="mt-5 h-[280px] w-full rounded-2xl border border-white/10 sm:h-[400px]"
          />
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {spots.map((spot) => (
              <li key={spot.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm font-bold text-white">{spot.name}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {spot.waterbody_name} · {spot.city}, {spot.region}
                </p>
                <p className="mt-1 text-xs text-[#D7FF35]">
                  {spot.disciplines.join(" · ") || "Публичный спот"}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
