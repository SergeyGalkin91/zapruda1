/** Strictly PUBLIC and moderator-approved geodata. Never accept user catch GPS or paid listings here. */
export type PublicSpot = {
  id: string;
  name: string;
  city: string;
  region: string;
  waterbody_name: string;
  public_lat: number | null;
  public_lng: number | null;
  disciplines: string[];
  state: string;
  reviewed_at: string | null;
};

export function isApprovedPublicSpot(spot: PublicSpot): boolean {
  return (
    spot.state === "approved" &&
    spot.reviewed_at !== null &&
    spot.name.trim().length > 0 &&
    spot.public_lat !== null &&
    spot.public_lng !== null &&
    Number.isFinite(spot.public_lat) &&
    Number.isFinite(spot.public_lng) &&
    Math.abs(spot.public_lat) <= 90 &&
    Math.abs(spot.public_lng) <= 180
  );
}

/** Safe input to public map provider; only reviewed, published PUBLIC spots. */
export function approvedMapUrl(spots: readonly PublicSpot[]): string | null {
  const approved = spots.filter(isApprovedPublicSpot).slice(0, 20);
  if (!approved.length) return null;
  const first = approved[0]!;
  const center = first.public_lng + "," + first.public_lat;
  const markers = approved
    .map((spot) => spot.public_lng + "," + spot.public_lat + ",pm2grm")
    .join("~");
  return (
    "https://yandex.ru/map-widget/v1/?ll=" +
    encodeURIComponent(center) +
    "&z=12&pt=" +
    encodeURIComponent(markers)
  );
}
