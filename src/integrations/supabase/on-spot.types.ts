import type { Json } from "./types";

/** STAGING-only contracts; membership never means physical presence. */
export type OnSpotZone = {
  zone_id: string;
  chat_place_id: string;
  name: string;
  area_label: string;
  country_code: string;
  is_member: boolean;
};

export type OnSpotFunctions = {
  zc_osp_catalog: { Args: Record<string, never>; Returns: OnSpotZone[] };
  zc_osp_join: { Args: { p_zone: string }; Returns: string };
  zc_osp_leave: { Args: { p_zone: string }; Returns: undefined };
  zc_osp_social: {
    Args: { p_action: string; p_zone: string | null; p_payload?: Json };
    Returns: Json;
  };
  zc_osp_shared_photo_access: { Args: { p_photo: string }; Returns: boolean };
};
