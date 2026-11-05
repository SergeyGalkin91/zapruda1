import { Fragment, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { closeOnSpotSession } from "@/lib/on-spot-api";

/** Private route state must never survive an identity change; token refresh preserves drafts. */
export function AuthSessionBoundary({
  children,
  resetCache,
}: {
  children: ReactNode;
  resetCache: () => void;
}) {
  const [identity, setIdentity] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    let observed = false;
    let previous: string | null | undefined;
    let token = "";
    const apply = (next: string | null, nextToken = "") => {
      if (!active) return;
      const stale = token;
      token = nextToken;
      if (next === previous) return;
      if (previous && stale) {
        // Captured old JWT. Do not await a Supabase request inside the auth callback.
        void Promise.resolve()
          .then(() => closeOnSpotSession(stale))
          .catch(() => undefined);
      }
      previous = next;
      resetCache();
      setIdentity(next);
    };
    let unsubscribe = () => {};
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        observed = true;
        apply(session?.user.id ?? null, session?.access_token ?? "");
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void supabase.auth
        .getSession()
        .then(({ data, error }) => {
          if (!observed)
            apply(
              error ? null : (data.session?.user.id ?? null),
              error ? "" : (data.session?.access_token ?? ""),
            );
        })
        .catch(() => {
          if (!observed) apply(null);
        });
    } catch {
      apply(null);
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [resetCache]);
  return (
    <Fragment key={identity === undefined ? "initial" : (identity ?? "guest")}>{children}</Fragment>
  );
}
