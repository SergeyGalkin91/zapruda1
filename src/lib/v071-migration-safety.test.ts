import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase", "migrations");
const guideBaseline = "20261106000000_guide_profiles_commissions.sql";
const guideLock = "20261106001000_guide_payment_contact_lock_p0.sql";
const competitionBase = "20261102160000_team_competitions.sql";
const competitionGuard = "20261102162000_competition_team_limit_for_update_p0.sql";
const aiBase = "20261102170000_ai_daily_advices_grok.sql";
const aiClaim = "20261102171000_ai_daily_advice_atomic_claim.sql";
const aiLeaseGuard = "20261102174000_ai_daily_advice_lease_expiry_guard.sql";

describe("v0.7.1 migration dependency and safety contract", () => {
  it.each([
    [guideBaseline, guideLock],
    [competitionBase, competitionGuard],
    [aiBase, aiClaim],
    [aiClaim, aiLeaseGuard],
  ])("%s must run before %s", (before, after) => {
    expect(existsSync(join(dir, before))).toBe(true);
    expect(existsSync(join(dir, after))).toBe(true);
    expect(before.slice(0, 14) < after.slice(0, 14)).toBe(true);
  });

  it("does not retain the premature guide quote lock", () => {
    expect(existsSync(join(dir, "20261102161000_guide_payment_contact_lock_p0.sql"))).toBe(false);
  });

  it("prevents client quote writes and direct access to internal trigger RPCs", () => {
    const quote = readFileSync(join(dir, guideLock), "utf8");
    const grants = readFileSync(join(dir, "20261102173000_revoke_internal_trigger_execute_p0.sql"), "utf8");
    expect(quote).toMatch(/revoke insert, update, delete on public\.guide_booking_quotes from anon, authenticated/i);
    expect(grants).toContain("public.enforce_competition_team_limit()");
    expect(grants).toContain("public.guard_guide_quote_payment_fields()");
  });

  it("requires a valid active lease before committing AI advice", () => {
    const lease = readFileSync(join(dir, aiLeaseGuard), "utf8");
    expect(lease).toContain("p_lease_token is null");
    expect(lease).toContain("r.lease_expires_at <= clock_timestamp()");
  });

  it("never contains a webhook path that can write paid", () => {
    const webhook = readFileSync(join(process.cwd(), "supabase/functions/guide-payment-webhook/index.ts"), "utf8");
    expect(webhook).not.toMatch(/mark_guide_booking_paid_from_provider/);
    expect(webhook).not.toMatch(/GUIDE_PAYMENT_PROVIDER_PROOF/);
    expect(webhook).toMatch(/return respond\(501,/);
  });
});
