/** Optional, short-lived handoff. Never copies GPS, photos, authentication or verification. */
const PREFIX = "zapruda:big-fish-handoff:v1:";
const TTL = 30 * 60 * 1000;
const speciesNames: Record<string, string> = {
  щука: "pike",
  судак: "zander",
  окунь: "perch",
  жерех: "asp",
  голавль: "chub",
  pike: "pike",
  zander: "zander",
  perch: "perch",
  asp: "asp",
  chub: "chub",
};
export type FishHandoff = { species: string; weight_g: number; length_mm: number | null };
export type ReportHandoff = {
  report_id: string;
  expires_at: number;
  fish: FishHandoff[];
  selected: number | null;
};
const validId = (id: string) =>
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
const positiveInt = (n: unknown) =>
  Number.isSafeInteger(n) && Number(n) > 0 && Number(n) <= 2147483647;

export function createReportHandoff(
  reportId: string,
  catches: ReadonlyArray<{ species: string; weight: string; length: string }>,
  now = Date.now(),
): ReportHandoff | null {
  if (!validId(reportId)) return null;
  const fish = catches
    .flatMap((caught) => {
      const species = speciesNames[caught.species.trim().toLowerCase()];
      const weight = Number(caught.weight) * 1000,
        length = Number(caught.length) * 10;
      if (!species || !positiveInt(Math.round(weight)) || !Number.isFinite(weight)) return [];
      return [
        {
          species,
          weight_g: Math.round(weight),
          length_mm:
            caught.length.trim() && positiveInt(Math.round(length)) ? Math.round(length) : null,
        },
      ];
    })
    .slice(0, 100);
  return fish.length ? { report_id: reportId, expires_at: now + TTL, fish, selected: null } : null;
}

export function saveReportHandoff(actor: string, value: ReportHandoff): boolean {
  if (!validId(actor)) return false;
  try {
    sessionStorage.setItem(PREFIX + actor, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function clearReportHandoff(actor: string) {
  try {
    sessionStorage.removeItem(PREFIX + actor);
  } catch {
    /* Local store may be blocked. */
  }
}
export function readReportHandoff(actor: string, now = Date.now()): ReportHandoff | null {
  if (!validId(actor)) return null;
  try {
    const raw = JSON.parse(
      sessionStorage.getItem(PREFIX + actor) || "null",
    ) as ReportHandoff | null;
    if (
      !raw ||
      !validId(raw.report_id) ||
      !Number.isFinite(raw.expires_at) ||
      raw.expires_at <= now ||
      raw.expires_at > now + TTL ||
      !Array.isArray(raw.fish)
    ) {
      clearReportHandoff(actor);
      return null;
    }
    if (
      !raw.fish.length ||
      raw.fish.length > 100 ||
      raw.fish.some(
        (f) =>
          !f ||
          !Object.values(speciesNames).includes(f.species) ||
          !positiveInt(f.weight_g) ||
          (f.length_mm !== null && !positiveInt(f.length_mm)),
      )
    )
      return null;
    const fish = raw.fish.map((f) => ({
      species: f.species,
      weight_g: f.weight_g,
      length_mm: f.length_mm,
    }));
    return {
      report_id: raw.report_id,
      expires_at: raw.expires_at,
      fish,
      selected:
        Number.isInteger(raw.selected) &&
        raw.selected !== null &&
        raw.selected >= 0 &&
        raw.selected < fish.length
          ? raw.selected
          : null,
    };
  } catch {
    return null;
  }
}
export const FISH_NAMES: Record<string, string> = {
  pike: "Щука",
  zander: "Судак",
  perch: "Окунь",
  asp: "Жерех",
  chub: "Голавль",
};
