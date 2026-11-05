import { beforeEach, describe, expect, it, vi } from "vitest";
import { onSpotCatalog, onSpotMembership } from "./on-spot-api";
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  rpc: vi.fn(),
  header: vi.fn(),
  allowed: true,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: mocks.getSession }, rpc: mocks.rpc },
}));
// Preserve actual spotToken's current-user/confirmation checks.
vi.mock("./spot-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./spot-api")>()),
  isSpotStaging: () => mocks.allowed,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.allowed = true;
  mocks.getSession.mockResolvedValue({
    data: {
      session: {
        user: { id: "fixture-owner", email_confirmed_at: "2026-01-01", is_anonymous: false },
        access_token: "offline-captured-token",
      },
    },
    error: null,
  });
  mocks.header.mockResolvedValue({ data: [], error: null });
  mocks.rpc.mockReturnValue({ setHeader: mocks.header });
});
describe("ON SPOT+ actor binding (offline API regressions, not signed JWT)", () => {
  it("pins each RPC to the captured confirmed actor token and has no user-id override", async () => {
    await onSpotCatalog("fixture-owner");
    expect(mocks.rpc).toHaveBeenCalledWith("zc_osp_catalog", {});
    expect(mocks.header).toHaveBeenLastCalledWith("Authorization", "Bearer offline-captured-token");
    await onSpotMembership("fixture-owner", "zone", true);
    expect(mocks.rpc).toHaveBeenLastCalledWith("zc_osp_join", { p_zone: "zone" });
    await onSpotMembership("fixture-owner", "zone", false);
    expect(mocks.rpc).toHaveBeenLastCalledWith("zc_osp_leave", { p_zone: "zone" });
  });
  it("refuses an intent from a previous actor before sending an RPC", async () => {
    await expect(onSpotMembership("previous-actor", "zone", true)).rejects.toThrow(
      /Сессия изменилась/,
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { id: "fixture-owner" },
    { id: "fixture-owner", email_confirmed_at: "2026-01-01", is_anonymous: true },
  ])("rejects a missing/unconfirmed/anonymous session", async (user) => {
    mocks.getSession.mockResolvedValue({
      data: { session: user ? { user, access_token: "offline" } : null },
      error: null,
    });
    await expect(onSpotCatalog("fixture-owner")).rejects.toThrow(/Сессия изменилась/);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not issue the RPC outside STAGING", async () => {
    mocks.allowed = false;
    await expect(onSpotCatalog("fixture-owner")).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
