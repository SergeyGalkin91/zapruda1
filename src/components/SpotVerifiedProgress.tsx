import { useCallback, useEffect, useRef, useState } from "react";
import { Crown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isSpotStaging, spotAction, type SpotOwnProgress } from "@/lib/spot-api";
import { NOMINATION_TITLES, type RecordNomination } from "@/lib/spot-records";
import { FISH_NAMES } from "@/lib/report-big-fish-handoff";

const statusText = {
  pending: "На независимой проверке",
  verified: "Улов подтверждён",
  rejected: "Заявка отклонена",
  revoked: "Подтверждение отозвано",
};
const titleText = (nomination: string) =>
  NOMINATION_TITLES[nomination as RecordNomination] || "Подтверждённый титул";

export function SpotVerifiedProgress({ id = "verified-titles" }: { id?: string }) {
  const [actor, setActor] = useState("");
  const [data, setData] = useState<SpotOwnProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const version = useRef(0);
  const invalidate = useCallback(() => {
    version.current++;
  }, []);
  const allowed = isSpotStaging();
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    void supabase.auth
      .getUser()
      .then(({ data: auth }) => {
        if (!active) return;
        setActor(auth.user?.email_confirmed_at && !auth.user.is_anonymous ? auth.user.id : "");
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setActor("");
          setLoading(false);
          setError("Не удалось проверить вход. Обнови страницу.");
        }
      });
    return () => {
      active = false;
      invalidate();
    };
  }, [allowed, invalidate]);
  const load = useCallback(async () => {
    if (!actor) return;
    const generation = ++version.current;
    setLoading(true);
    setError("");
    try {
      const result = await spotAction<{ progress: SpotOwnProgress }>(actor, "progress");
      if (generation !== version.current) return;
      if (
        !result.progress ||
        !Array.isArray(result.progress.catches) ||
        !Array.isArray(result.progress.titles) ||
        !Array.isArray(result.progress.history)
      )
        throw new Error("Invalid progress response");
      setData(result.progress);
    } catch {
      if (generation === version.current) {
        setData(null);
        setError("Не удалось загрузить подтверждённые уловы и титулы. Попробуй ещё раз.");
      }
    } finally {
      if (generation === version.current) setLoading(false);
    }
  }, [actor]);
  useEffect(() => {
    void load();
    const refresh = () => {
      void load();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("zapruda:spot-progress-changed", refresh);
    return () => {
      invalidate();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("zapruda:spot-progress-changed", refresh);
    };
  }, [load, invalidate]);
  if (!allowed) return null;
  return (
    <section id={id} aria-labelledby={id + "-heading"} className="z-premium-card my-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id + "-heading"} className="flex items-center gap-2 text-xl font-bold">
          <Crown className="size-5 text-[#D7FF35]" /> Подтверждённые титулы
        </h2>
        {actor && (
          <button
            className="btn-ghost text-sm"
            disabled={loading}
            onClick={() => void load()}
            type="button"
          >
            <RefreshCw className="mr-2 size-4" /> Обновить статус
          </button>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        KING появляется после независимой проверки улова и серверного решения о рекорде. Опыт и
        активность не присваивают корону.
      </p>
      {loading && (
        <p role="status" className="mt-4 text-sm">
          Загружаем подтверждённый прогресс…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}
      {!loading && !actor && !error && (
        <a href="/auth?mode=in" className="btn-primary mt-4">
          Войти в подтверждённый аккаунт
        </a>
      )}
      {!loading && data && (
        <>
          {!data.titles.length ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Действующих подтверждённых титулов пока нет.
            </p>
          ) : (
            <ul aria-label="Действующие KING-титулы" className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.titles.map((t) => (
                <li key={t.category_id} className="rounded-xl border border-[#D7FF35]/30 p-4">
                  <Crown className="size-5 text-[#D7FF35]" />
                  <h3 className="mt-2 font-bold">{titleText(t.nomination)}</h3>
                  <p className="mt-1 text-sm">
                    {t.unit === "g" ? t.score / 1000 : t.score} {t.unit === "g" ? "кг" : "мм"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-6 font-bold">Мои заявки BIG FISH</h3>
          {!data.catches.length ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Заявок пока нет. Отчёт о рыбалке и заявка на рекорд — отдельные действия.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.catches.map((c) => (
                <li key={c.catch_id} className="rounded-xl border border-white/10 p-4">
                  <p className="font-semibold">
                    {FISH_NAMES[c.species] || c.species} · {c.weight_g / 1000} кг
                  </p>
                  <p className="mt-1 text-sm">{statusText[c.status] || "Статус уточняется"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {data.titles
                      .filter((t) => t.catch_id === c.catch_id)
                      .map((t) => titleText(t.nomination))
                      .join(" · ") ||
                      (c.status === "verified"
                        ? "Подтверждение улова не означает действующий рекорд."
                        : "Решение о рекорде принимает сервер после проверки.")}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {!!data.history.length && (
            <details className="mt-6">
              <summary className="cursor-pointer font-bold">История моих титулов</summary>
              <ul className="mt-3 space-y-2 text-sm">
                {data.history.map((h) => (
                  <li key={h.event_id}>
                    {titleText(h.nomination)} ·{" "}
                    {h.event === "received"
                      ? "Титул получен"
                      : h.event === "updated"
                        ? "Рекорд обновлён"
                        : "Период владения завершён"}{" "}
                    · {new Date(h.changed_at).toLocaleDateString("ru-RU")}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <a className="btn-primary" href="/big-fish">
          Подать одну рыбу в BIG FISH
        </a>
        <a className="btn-ghost" href="/competitions#spot-records">
          Проверенные рекорды
        </a>
      </div>
    </section>
  );
}
