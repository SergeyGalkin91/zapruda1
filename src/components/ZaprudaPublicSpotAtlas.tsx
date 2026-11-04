import { useEffect, useMemo, useState } from "react";
import { MapPinned, ShieldCheck } from "lucide-react";
import { BrandFish } from "@/components/Wordmark";
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
  const [selected, setSelected] = useState<string | null>(null);

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

  const mapUrl = useMemo(
    () => approvedMapUrl(selected ? spots.filter((spot) => spot.id === selected) : spots),
    [spots, selected],
  );
  // A real provider basemap with no markers is honest when the approved catalog is empty.
  const emptyBasemap = "https://yandex.ru/map-widget/v1/?ll=44.0%2C56.3&z=5&l=map&theme=dark";

  if (!stagingOnly) return null;

  return (
    <section
      aria-labelledby="zc-approved-spots-heading"
      id="approved-spot-map"
      className="z-premium-card mt-5 p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-[#D7FF35]">
            <MapPinned className="size-4" aria-hidden="true" /> ZAPRUDA SPOT
          </p>
          <h2 id="zc-approved-spots-heading" className="mt-2 text-xl font-black text-white">
            Твоя вода. Твой SPOT.
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

      <div className="z-spot-map mt-5">
        <iframe
          title="Карта проверенных публичных спотов ZAPRUDA"
          src={mapUrl ?? emptyBasemap}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <span className="z-spot-map-badge">
          SPOT / {spots.length ? "Проверенные точки" : "Общая карта · без точек"}
        </span>
        {!spots.length && (
          <p className="z-spot-map-note">
            Только настоящие места после проверки. Неподтверждённые точки не показаны.
          </p>
        )}
      </div>
      <a
        href={mapUrl ?? emptyBasemap}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 items-center text-xs text-muted-foreground underline"
      >
        Яндекс Карты · открыть отдельно ↗
      </a>

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
          Проверенных спотов пока нет. Здесь появятся настоящие карточки после независимой
          модерации.
        </div>
      )}
      {!loading && !error && mapUrl && (
        <>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {spots.map((spot) => (
              <li key={spot.id}>
                <button
                  type="button"
                  className="z-spot-card"
                  aria-pressed={selected === spot.id}
                  onClick={() => setSelected((current) => (current === spot.id ? null : spot.id))}
                >
                  <span className="z-spot-pin" aria-hidden="true">
                    <BrandFish />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-white">{spot.name}</span>
                    <span className="mt-1 block text-xs text-zinc-400">
                      {spot.waterbody_name} · {spot.city}, {spot.region}
                    </span>
                    <span className="mt-1 block text-xs text-[#D7FF35]">
                      {spot.disciplines.join(" · ") || "Публичный спот"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
