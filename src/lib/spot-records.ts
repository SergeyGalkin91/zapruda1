/**
 * ZAPRUDA v0.7.5 SPOT — deterministic ranking policy (no DB writes).
 *
 * Pure policy only. Call on the server AFTER authorized proof moderation.
 * Never trust a browser-provided "verified" flag or geography.
 * See docs/ZAPRUDA_V075_SPOT_RELEASE_PLAN.md and #84.
 */
export type FishingLeague = "street" | "ultralight" | "carpfishing" | "winter" | "boat";
export type RecordNomination =
  | "spot-big-fish"
  | "spot-longest"
  | "ul-big-fish"
  | "ul-smallest"
  | "carp-big-fish"
  | "ice-big-fish"
  | "boat-big-fish";
export type FishingMethod =
  | "shore-spinning"
  | "feeder"
  | "float"
  | "bottom"
  | "ultralight"
  | "carpfishing"
  | "ice-lure"
  | "ice-mormyshka"
  | "ice-float"
  | "ice-tipup"
  | "boat-spinning"
  | "boat-vertical"
  | "boat-trolling";
export type ScopeType = "spot" | "waterbody" | "municipality" | "region" | "country";

export type RecordCategory = Readonly<{
  league: FishingLeague;
  nomination: RecordNomination;
  method: FishingMethod;
  scopeType: ScopeType;
  scopeId: string;
  /** Species-specific for carp, winter and boat. Optional for shore/UL. */
  speciesId?: string;
  /** Required for seasonal winter categories; optional explicit cycle for other leagues. */
  seasonId?: string;
}>;

export type ModeratedCatch = Readonly<{
  catchId: string;
  ownerId: string;
  speciesId: string;
  method: FishingMethod;
  /** Verified capture geography; never publish private source coordinates. */
  scopes: ReadonlyArray<Readonly<{ type: ScopeType; id: string }>>;
  weightGrams: number | null;
  lengthMm: number | null;
  status: "pending" | "verified" | "rejected" | "revoked";
  lawful: boolean;
  proofAccepted: boolean;
  /** Server-approved technique/equipment validation for UL nominations. */
  ultralightGearAccepted?: boolean;
  /** Protect fish welfare; small-fish category is never credited for targeting juveniles. */
  targetedJuvenile?: boolean;
  /** Server-validated season, not user-defined time metadata. */
  seasonId?: string;
}>;

type EligibleRecord = { eligible: true; score: number; recordKey: string };
type IneligibleRecord = { eligible: false; reason: string };
export type Evaluation = EligibleRecord | IneligibleRecord;

export const NOMINATION_TITLES: Readonly<Record<RecordNomination, string>> = {
  "spot-big-fish": "KING OF THE SPOT",
  "spot-longest": "LENGTH KING",
  "ul-big-fish": "KING OF UL",
  "ul-smallest": "MICRO KING",
  "carp-big-fish": "KING OF THE LAKE",
  "ice-big-fish": "KING OF THE ICE",
  "boat-big-fish": "TROPHY KING",
};

const isNonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const speciesRequired = (league: FishingLeague) =>
  league === "carpfishing" || league === "winter" || league === "boat";

function matchesLeagueRule(category: RecordCategory): boolean {
  const { league, nomination, method, scopeType, seasonId } = category;
  switch (league) {
    case "street":
      return (
        (nomination === "spot-big-fish" || nomination === "spot-longest") &&
        scopeType === "spot" &&
        ["shore-spinning", "feeder", "float", "bottom"].includes(method)
      );
    case "ultralight":
      return (
        (nomination === "ul-big-fish" || nomination === "ul-smallest") &&
        scopeType === "spot" &&
        method === "ultralight"
      );
    case "carpfishing":
      return (
        nomination === "carp-big-fish" && scopeType === "waterbody" && method === "carpfishing"
      );
    case "winter":
      return (
        nomination === "ice-big-fish" &&
        scopeType === "region" &&
        isNonEmpty(seasonId) &&
        ["ice-lure", "ice-mormyshka", "ice-float", "ice-tipup"].includes(method)
      );
    case "boat":
      return (
        nomination === "boat-big-fish" &&
        ["waterbody", "municipality", "region", "country"].includes(scopeType) &&
        ["boat-spinning", "boat-vertical", "boat-trolling"].includes(method)
      );
  }
}

/** Collision-safe canonical composite key. Delimiter characters inside IDs are legal. */
export function recordCategoryKey(category: RecordCategory): string | null {
  if (
    !matchesLeagueRule(category) ||
    !isNonEmpty(category.scopeId) ||
    (speciesRequired(category.league) && !isNonEmpty(category.speciesId)) ||
    (category.speciesId !== undefined && !isNonEmpty(category.speciesId)) ||
    (category.seasonId !== undefined && !isNonEmpty(category.seasonId))
  ) {
    return null;
  }
  return JSON.stringify([
    category.league,
    category.nomination,
    category.method,
    category.scopeType,
    category.scopeId,
    category.speciesId ?? null,
    category.seasonId ?? null,
  ]);
}

function isValidMeasurement(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value > 0;
}

function isMinimumNomination(nomination: RecordNomination) {
  return nomination === "ul-smallest";
}

function usesLength(nomination: RecordNomination) {
  return nomination === "spot-longest" || nomination === "ul-smallest";
}

/**
 * Apply only to trusted server-loaded, moderated catches.
 * This does not independently verify authenticity, legal catch, region or gear.
 */
export function evaluateCatchForRecord(
  category: RecordCategory,
  candidate: ModeratedCatch,
): Evaluation {
  const key = recordCategoryKey(category);
  if (!key) return { eligible: false, reason: "Invalid ranking category" };
  if (!isNonEmpty(candidate.catchId) || !isNonEmpty(candidate.ownerId)) {
    return { eligible: false, reason: "Missing catch identity" };
  }
  if (candidate.status !== "verified" || !candidate.proofAccepted || !candidate.lawful) {
    return { eligible: false, reason: "Catch not approved for records" };
  }
  if (candidate.method !== category.method) {
    return { eligible: false, reason: "Fishing discipline mismatch" };
  }
  if (!candidate.scopes.some((s) => s.type === category.scopeType && s.id === category.scopeId)) {
    return { eligible: false, reason: "Capture territory not verified" };
  }
  if (category.speciesId && candidate.speciesId !== category.speciesId) {
    return { eligible: false, reason: "Species mismatch" };
  }
  if (category.seasonId && candidate.seasonId !== category.seasonId) {
    return { eligible: false, reason: "Season mismatch" };
  }
  if (category.league === "ultralight" && candidate.ultralightGearAccepted !== true) {
    return { eligible: false, reason: "UL tackle proof not approved" };
  }
  if (isMinimumNomination(category.nomination) && candidate.targetedJuvenile !== false) {
    return { eligible: false, reason: "Micro-catch welfare review required" };
  }
  const score = usesLength(category.nomination) ? candidate.lengthMm : candidate.weightGrams;
  if (!isValidMeasurement(score)) {
    return { eligible: false, reason: "Missing valid verified measurement" };
  }
  return { eligible: true, score, recordKey: key };
}

/** Equal scores DO NOT dethrone an incumbent: tie policy requires owner approval. */
export function shouldReplaceRecord(
  category: RecordCategory,
  challenger: ModeratedCatch,
  incumbent: ModeratedCatch | null,
): boolean {
  const next = evaluateCatchForRecord(category, challenger);
  if (!next.eligible) return false;
  if (!incumbent) return true;
  if (incumbent.catchId === challenger.catchId) return false;
  const previous = evaluateCatchForRecord(category, incumbent);
  if (!previous.eligible) return true;
  return isMinimumNomination(category.nomination)
    ? next.score < previous.score
    : next.score > previous.score;
}

/**
 * Pure notification routing key. Delivery must be transactionally enqueued
 * after an actual server-side title change, never directly from client input.
 */
export function titleChangedEventKey(category: RecordCategory, newCatchId: string): string | null {
  const key = recordCategoryKey(category);
  return key && isNonEmpty(newCatchId) ? JSON.stringify(["title-changed", key, newCatchId]) : null;
}
