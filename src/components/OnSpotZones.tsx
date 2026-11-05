import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, MessageCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isSpotStaging } from "@/lib/spot-api";
import { onSpotCatalog, onSpotMembership } from "@/lib/on-spot-api";
import type { OnSpotZone } from "@/integrations/supabase/on-spot.types";
import { OnSpotZoneSocial } from "@/components/OnSpotZoneSocial";

/** Explicit chat participation only. No geolocation, member roster or inferred presence. */
export function OnSpotZones() {
  const allowed = isSpotStaging();
  const [actor, setActor] = useState("");
  const [zones, setZones] = useState<OnSpotZone[]>([]);
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [openZone, setOpenZone] = useState("");
  const generation = useRef(0);
  const membershipRequest = useRef(0);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  const invalidateMembership = useCallback(() => {
    membershipRequest.current++;
  }, []);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    let observed = false;
    let identity: string | undefined;
    const apply = (
      user: { id: string; email_confirmed_at?: string; is_anonymous?: boolean } | null,
    ) => {
      if (!active) return;
      const next = user?.email_confirmed_at && !user.is_anonymous ? user.id : "";
      if (next !== identity) {
        identity = next;
        invalidate();
        invalidateMembership();
        setZones([]);
        setOpenZone("");
        setBusy("");
        setError("");
        setActor(next);
        setLoading(Boolean(next));
      }
    };
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      observed = true;
      // No async Supabase calls inside the auth callback.
      apply(session?.user ?? null);
    });
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!observed) apply(error ? null : data.user);
      })
      .catch(() => {
        if (active && !observed) {
          apply(null);
          setError("Не удалось проверить вход. Обнови страницу.");
        }
      });
    return () => {
      active = false;
      invalidate();
      invalidateMembership();
      data.subscription.unsubscribe();
    };
  }, [allowed, invalidate, invalidateMembership]);

  const load = useCallback(async () => {
    if (!actor) return;
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const rows = await onSpotCatalog(actor);
      if (current === generation.current) setZones(rows);
    } catch (cause) {
      if (current === generation.current) {
        setZones([]);
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить зоны.");
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    void load();
    return invalidate;
  }, [load, invalidate]);

  async function change(zone: OnSpotZone) {
    if (!actor || busy || loading) return;
    const current = ++generation.current;
    const request = ++membershipRequest.current;
    setBusy(zone.zone_id);
    setError("");
    try {
      await onSpotMembership(actor, zone.zone_id, !zone.is_member);
      if (current !== generation.current) return;
      if (zone.is_member && openZone === zone.zone_id) setOpenZone("");
      // Re-read authority instead of displaying an optimistic membership.
      await load();
    } catch (cause) {
      if (current === generation.current)
        setError(cause instanceof Error ? cause.message : "Не удалось изменить участие.");
    } finally {
      if (request === membershipRequest.current) setBusy("");
    }
  }

  return (
    <section className="z-premium-card p-5 sm:p-7" aria-labelledby="on-spot-zones-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="on-spot-zones-title" className="text-xl font-bold">
          Локальные зоны
        </h2>
        {actor && (
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={loading || Boolean(busy)}
            onClick={() => void load()}
          >
            <RefreshCw className="mr-2 size-4" />
            Обновить зоны
          </button>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Выбирай зону и вступай в её чат по желанию. Участие не показывает, где ты сейчас: геолокация
        и список людей не публикуются.
      </p>
      {!allowed && <p className="mt-4 text-sm">Локальные зоны пока не открыты.</p>}
      {loading && (
        <p role="status" className="mt-4 text-sm">
          Загружаем локальные зоны…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}
      {allowed && !loading && !actor && !error && (
        <Link to="/auth" search={{ mode: "in" }} className="btn-primary mt-4">
          Войти в подтверждённый аккаунт
        </Link>
      )}
      {allowed && !loading && actor && !error && !zones.length && (
        <p className="mt-5 text-sm text-muted-foreground">
          Проверенные локальные зоны ещё не открыты. Можно общаться в общем чате или найти компанию
          на выезд.
        </p>
      )}
      {!!zones.length && (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2" aria-label="Проверенные локальные зоны">
          {zones.map((zone) => (
            <li key={zone.zone_id} className="min-w-0 rounded-2xl border border-border p-4">
              <h3 className="break-words text-lg font-bold">{zone.name}</h3>
              <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 break-words">{zone.area_label}</span>
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {zone.is_member ? "Ты участвуешь в чате зоны" : "Чат открывается после вступления"}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {zone.is_member && !loading && !busy && (
                  <Link
                    to="/chat"
                    search={{ place: zone.chat_place_id, country: "", topic: "general" }}
                    className="btn-primary"
                  >
                    <MessageCircle className="mr-2 size-4" />
                    Открыть чат
                  </Link>
                )}
                {zone.is_member && (
                  <button
                    type="button"
                    className="btn-ghost min-h-11"
                    disabled={loading || Boolean(busy)}
                    aria-expanded={openZone === zone.zone_id}
                    onClick={() => setOpenZone(openZone === zone.zone_id ? "" : zone.zone_id)}
                  >
                    Люди и встречи
                  </button>
                )}
                <button
                  type="button"
                  className={zone.is_member ? "btn-ghost" : "btn-primary"}
                  disabled={loading || Boolean(busy)}
                  onClick={() => void change(zone)}
                  aria-label={(zone.is_member ? "Выйти из зоны " : "Вступить в зону ") + zone.name}
                >
                  {busy === zone.zone_id
                    ? "Сохраняем…"
                    : zone.is_member
                      ? "Выйти из зоны"
                      : "Вступить в зону"}
                </button>
              </div>
              {actor && zone.is_member && openZone === zone.zone_id && (
                <OnSpotZoneSocial
                  key={actor + ":" + zone.zone_id}
                  actor={actor}
                  zone={zone.zone_id}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
