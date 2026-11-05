import { supabase } from "@/integrations/supabase/client";

export const isSpotStaging = () =>
  import.meta.env["VITE_SUPABASE_URL"] === "https://yudtbifopfnjtjanaqrd.supabase.co" ||
  (typeof window !== "undefined" &&
    /^deploy-preview-[0-9]+--zapruda1[.]netlify[.]app$/.test(window.location.hostname));

/** The current actor is checked again immediately before a private operation. */
export async function spotToken(actor: string): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (
    error ||
    data.session?.user.id !== actor ||
    data.session.user.is_anonymous ||
    !data.session.user.email_confirmed_at ||
    !data.session.access_token
  )
    throw new Error("Сессия изменилась. Повтори действие из своего аккаунта.");
  return data.session.access_token;
}

export async function spotAction<T>(
  actor: string,
  action: string,
  extra: Record<string, unknown> = {},
): Promise<T> {
  const token = await spotToken(actor);
  const { data, error } = await supabase.functions.invoke("zapruda-spot-records", {
    body: { ...extra, action },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error || data?.error)
    throw new Error(typeof data?.error === "string" ? data.error : "Операция недоступна.");
  return data as T;
}

export type SpotOwnCatch = {
  catch_id: string;
  league: string;
  species: string;
  weight_g: number;
  length_mm: number;
  status: "pending" | "verified" | "rejected" | "revoked";
  created_at: string;
};
export type SpotOwnTitle = {
  category_id: string;
  catch_id: string;
  nomination: string;
  league: string;
  score: number;
  unit: "g" | "mm";
  updated_at: string;
};
export type SpotTitleEvent = {
  event_id: string;
  nomination: string;
  event: "received" | "updated" | "ended";
  changed_at: string;
};
export type SpotOwnProgress = {
  catches: SpotOwnCatch[];
  titles: SpotOwnTitle[];
  history: SpotTitleEvent[];
};
