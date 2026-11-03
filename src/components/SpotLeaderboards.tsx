import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type RecordRow = { title: string; nomination: string; method: string; species: string; score: number; unit: string };
type SpotRow = { id: string; name: string; city: string; disciplines: string[] };

export function SpotLeaderboards() {
  const staging =
    import.meta.env["VITE_SUPABASE_URL"] === "https://yudtbifopfnjtjanaqrd.supabase.co" ||
    (typeof window !== "undefined" &&
      /^deploy-preview-[0-9]+--zapruda1[.]netlify[.]app$/.test(window.location.hostname));
  const [spots, setSpots] = useState<SpotRow[]>([]);
  const [league, setLeague] = useState("street");
  const [spotId, setSpotId] = useState("");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!staging) return;
    let active = true;
    void supabase.from("zc_public_spots").select("id,name,city,disciplines")
      .eq("state", "approved").limit(100).then(({ data }) => {
        if (active) setSpots((data ?? []) as SpotRow[]);
      });
    return () => { active = false; };
  }, [staging]);

  useEffect(() => {
    if (!staging || !spotId) { setRecords([]); return; }
    let active = true;
    void supabase.rpc("zc_spot_public_leaderboard", {
      p_spot_id: spotId, p_league: league,
    }).then(({ data, error: queryError }) => {
      if (!active) return;
      setError(queryError ? "Рейтинг доступен после подтверждения аккаунта." : "");
      setRecords(!queryError && Array.isArray(data) ? (data as RecordRow[]) : []);
    });
    return () => { active = false; };
  }, [staging, league, spotId]);

  if (!staging) return null;
  return (
    <section className="mt-8 rounded-3xl border border-[#1239A6]/40 bg-[#0B0D12] p-5 sm:p-7">
      <h2 className="flex items-center gap-2 text-xl font-black text-white">
        <Crown className="size-5 text-[#D7FF35]" /> KING / Рекорды спотов
      </h2>
      <p className="mt-2 text-sm text-zinc-400">
        Подтверждённые уловы без закрытых координат и исходных фотографий.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select
          aria-label="Дисциплина"
          value={league}
          onChange={(event) => { setLeague(event.target.value); setSpotId(""); }}
          className="rounded-xl border border-white/20 bg-[#141923] p-3 text-white"
        >
          <option value="street">STREET FISHING</option>
          <option value="ultralight">ULTRALIGHT / MICROJIG</option>
        </select>
        <select
          aria-label="Проверенный спот"
          value={spotId}
          onChange={(event) => setSpotId(event.target.value)}
          className="rounded-xl border border-white/20 bg-[#141923] p-3 text-white"
        >
          <option value="">Выбрать спот</option>
          {spots.filter((spot) => spot.disciplines.includes(league)).map((spot) => (
            <option value={spot.id} key={spot.id}>{spot.name} · {spot.city}</option>
          ))}
        </select>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      {spotId && !records.length && !error && (
        <p className="mt-4 text-sm text-zinc-400">Проверенных рекордов пока нет.</p>
      )}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {records.map((record) => (
          <li key={record.nomination + record.method} className="rounded-2xl border border-[#1239A6]/30 bg-[#111829] p-4">
            <Crown className="size-6 text-[#D7FF35]" />
            <h3 className="mt-2 font-black text-white">{record.title}</h3>
            <p className="text-sm text-zinc-300">{record.species} · {record.method}</p>
            <p className="mt-2 text-xl font-bold text-[#D7FF35]">
              {record.unit === "g" ? record.score / 1000 : record.score} {record.unit === "g" ? "кг" : "мм"}
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              Имя и фото появятся только после согласия и удаления метаданных.
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
