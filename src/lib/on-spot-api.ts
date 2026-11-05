import { supabase } from "@/integrations/supabase/client";
import { isSpotStaging, spotToken } from "@/lib/spot-api";
import type { OnSpotZone } from "@/integrations/supabase/on-spot.types";
import type { Json } from "@/integrations/supabase/types";
import { z } from "zod";

async function actorToken(actor: string) {
  if (!isSpotStaging()) throw new Error("Локальные зоны пока недоступны.");
  return spotToken(actor);
}

export async function onSpotCatalog(actor: string): Promise<OnSpotZone[]> {
  const token = await actorToken(actor);
  const { data, error } = await supabase
    .rpc("zc_osp_catalog", {})
    .setHeader("Authorization", `Bearer ${token}`);
  if (error || !Array.isArray(data))
    throw new Error("Не удалось загрузить локальные зоны. Попробуй обновить список.");
  return data;
}

export async function onSpotMembership(actor: string, zone: string, join: boolean): Promise<void> {
  const token = await actorToken(actor);
  const operation = join ? "zc_osp_join" : "zc_osp_leave";
  const { error } = await supabase
    .rpc(operation, { p_zone: zone })
    .setHeader("Authorization", `Bearer ${token}`);
  if (error)
    throw new Error(
      join
        ? "Не удалось вступить. Зона могла закрыться или доступ ограничен. Обнови список."
        : "Не удалось выйти. Повтори действие; участие пока не изменено.",
    );
}

const id = z.string().uuid();
const person = z.object({ id, name: z.string() });
const source = z.object({ id, title: z.string() });
const snapshot = z.object({
  presence: z
    .object({ expires_at: z.string().datetime({ offset: true }), discoverable: z.boolean() })
    .nullable(),
  allow_invites: z.boolean(),
  announcements: z.boolean(),
  people: z.array(person),
  invites: z.array(
    z.object({
      id,
      status: z.enum(["pending", "accepted", "declined", "cancelled", "expired"]),
      outgoing: z.boolean(),
      peer_id: id,
      peer_name: z.string(),
      thread_id: id.nullable(),
      meetup_id: id.nullable(),
      report_id: id.nullable(),
    }),
  ),
  inbox: z.array(z.object({ id, body: z.string(), sender_name: z.string() })),
  photos: z.array(
    z.object({
      photo_id: id,
      status: z.enum(["pending", "approved", "declined", "revoked"]),
      owned: z.boolean(),
      owner_name: z.string(),
      can_view: z.boolean(),
    }),
  ),
  own_meetups: z.array(source),
  own_reports: z.array(source),
  own_photos: z.array(source),
  blocked: z.array(person),
});
export type OnSpotSnapshot = z.infer<typeof snapshot>;
export type OnSpotAction =
  | "presence_on"
  | "presence_off"
  | "preferences"
  | "invite"
  | "invite_reply"
  | "invite_cancel"
  | "block"
  | "unblock"
  | "announce"
  | "dismiss"
  | "link_trip"
  | "photo_request"
  | "photo_preview"
  | "photo_reply"
  | "photo_revoke"
  | "report";
export type OnSpotPayload = Record<string, Json>;

async function socialRpc(
  token: string,
  action: string,
  zone: string | null,
  payload: OnSpotPayload,
  signal?: AbortSignal,
) {
  const query = supabase
    .rpc("zc_osp_social", { p_action: action, p_zone: zone, p_payload: payload })
    .setHeader("Authorization", `Bearer ${token}`);
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error?.code === "54000") throw new Error("Слишком много действий. Попробуй позже.");
  if (error?.code === "42501") throw new Error("Действие недоступно. Проверь участие и согласия.");
  if (error) throw new Error("Не удалось обновить зону. Проверь соединение и повтори.");
  return data;
}

export async function onSpotSnapshot(actor: string, zone: string, signal?: AbortSignal) {
  return snapshot.parse(await socialRpc(await actorToken(actor), "snapshot", zone, {}, signal));
}

export async function onSpotAction(
  actor: string,
  action: OnSpotAction,
  zone: string | null,
  payload: OnSpotPayload = {},
) {
  const data = await socialRpc(await actorToken(actor), action, zone, payload);
  return z.object({ ok: z.literal(true), id: id.nullish() }).parse(data);
}

/** Called outside Auth's callback lock, using the old actor's captured token. */
export async function closeOnSpotSession(token: string) {
  if (!token || !isSpotStaging()) return;
  const deadline = AbortSignal.timeout(4000);
  // A deleted Auth session independently denies discovery/access and cascades presence.
  await socialRpc(token, "clear_session", null, {}, deadline);
}

export async function onSpotPhoto(actor: string, photoId: string): Promise<Blob> {
  const token = await actorToken(actor);
  const { data, error } = await supabase.functions.invoke<Blob>(
    "report-photo-access?photo_id=" + encodeURIComponent(id.parse(photoId)),
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/octet-stream" },
    },
  );
  if (error || !(data instanceof Blob) || data.type !== "application/octet-stream")
    throw new Error("Фото недоступно. Согласие могло измениться.");
  return data.slice(0, data.size, "image/jpeg");
}
