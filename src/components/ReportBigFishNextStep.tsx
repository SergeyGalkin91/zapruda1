import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  clearReportHandoff,
  FISH_NAMES,
  readReportHandoff,
  saveReportHandoff,
  type ReportHandoff,
} from "@/lib/report-big-fish-handoff";
import { isSpotStaging } from "@/lib/spot-api";

export function ReportBigFishNextStep() {
  const [actor, setActor] = useState("");
  const [handoff, setHandoff] = useState<ReportHandoff | null>(null);
  const [choice, setChoice] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isSpotStaging()) return;
    let active = true;
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active || !data.user?.email_confirmed_at || data.user.is_anonymous) return;
        setActor(data.user.id);
        setHandoff(readReportHandoff(data.user.id));
      })
      .catch(() => {
        if (active) {
          setActor("");
          setHandoff(null);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  if (!handoff) return null;
  return (
    <section className="z-premium-card mb-6 p-5" aria-label="Следующий шаг после отчёта">
      <p className="z-eyebrow">ОТЧЁТ СОХРАНЁН</p>
      <h2 className="mt-2 text-lg font-bold">Одна рыба — отдельная заявка BIG FISH</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Выбери одну рыбу. Для рекорда понадобятся проверенный спот, точное время и отдельное
        фотодоказательство. Публикация отчёта не присваивает титул.
      </p>
      <label className="mt-4 block text-sm">
        Рыба для заявки
        <select
          className="field mt-2 min-h-12 w-full"
          value={choice}
          onChange={(e) => setChoice(Number(e.target.value))}
        >
          {handoff.fish.map((fish, i) => (
            <option key={i} value={i}>
              {FISH_NAMES[fish.species]} · {fish.weight_g / 1000} кг
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (saveReportHandoff(actor, { ...handoff, selected: choice }))
              window.location.assign("/big-fish");
            else
              setError("Браузер не сохранил выбранную рыбу. Открой BIG FISH и внеси её вручную.");
          }}
        >
          Передать одну рыбу в BIG FISH
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            clearReportHandoff(actor);
            setHandoff(null);
          }}
        >
          Позже
        </button>
        <a href="/big-fish" className="btn-ghost">
          Открыть BIG FISH
        </a>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
