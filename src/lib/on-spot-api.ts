import { supabase } from "@/integrations/supabase/client";
import { isSpotStaging, spotToken } from "@/lib/spot-api";
import type { OnSpotZone } from "@/integrations/supabase/on-spot.types";

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
