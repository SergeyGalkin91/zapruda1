import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnSpotZones } from "./OnSpotZones";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  catalog: vi.fn(),
  membership: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  allowed: true,
  auth: null as
    | null
    | ((
        event: string,
        session: { user: { id: string; email_confirmed_at?: string } } | null,
      ) => void),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      onAuthStateChange: mocks.subscribe,
    },
  },
}));
vi.mock("@/lib/spot-api", () => ({ isSpotStaging: () => mocks.allowed }));
vi.mock("@/lib/on-spot-api", () => ({
  onSpotCatalog: mocks.catalog,
  onSpotMembership: mocks.membership,
}));
const actor = { id: "offline-owner", email_confirmed_at: "2026-01-01", is_anonymous: false };
const zone = {
  zone_id: "isolated-zone",
  chat_place_id: "isolated-room",
  name: "ISOLATED COMPONENT ZONE",
  area_label: "Coarse component fixture",
  country_code: "RU",
  is_member: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.allowed = true;
  mocks.auth = null;
  mocks.getUser.mockResolvedValue({ data: { user: actor }, error: null });
  mocks.catalog.mockResolvedValue([zone]);
  mocks.membership.mockResolvedValue(undefined);
  mocks.subscribe.mockImplementation((fn) => {
    mocks.auth = fn;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
});
afterEach(cleanup);
describe("ON SPOT+ catalog UI (offline component regressions, not JWT acceptance)", () => {
  it("opens the catalog without auto-joining, geolocation or a people roster", async () => {
    render(<OnSpotZones />);
    await screen.findByText(zone.name);
    expect(mocks.catalog).toHaveBeenCalledWith(actor.id);
    expect(mocks.membership).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /Открыть чат/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/человек|метров|км от тебя/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Вступить в зону " + zone.name })).toBeEnabled();
  });
  it("joins only on explicit intent and waits for the authoritative catalog before opening chat", async () => {
    render(<OnSpotZones />);
    const join = await screen.findByRole("button", { name: "Вступить в зону " + zone.name });
    let resolve!: (v: unknown) => void;
    mocks.catalog.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    fireEvent.click(join);
    await waitFor(() =>
      expect(mocks.membership).toHaveBeenCalledWith(actor.id, zone.zone_id, true),
    );
    expect(screen.queryByRole("link", { name: /Открыть чат/ })).not.toBeInTheDocument();
    await act(async () => resolve([{ ...zone, is_member: true }]));
    await screen.findByRole("link", { name: /Открыть чат/ });
    expect(screen.getByRole("button", { name: "Выйти из зоны " + zone.name })).toBeEnabled();
    mocks.catalog.mockResolvedValueOnce([zone]);
    fireEvent.click(screen.getByRole("button", { name: "Выйти из зоны " + zone.name }));
    await waitFor(() =>
      expect(mocks.membership).toHaveBeenLastCalledWith(actor.id, zone.zone_id, false),
    );
    await screen.findByRole("button", { name: "Вступить в зону " + zone.name });
    expect(screen.queryByRole("link", { name: /Открыть чат/ })).not.toBeInTheDocument();
  });
  it("retains membership and shows an error when leave fails", async () => {
    mocks.catalog.mockResolvedValue([{ ...zone, is_member: true }]);
    mocks.membership.mockRejectedValueOnce(new Error("Leave failed"));
    render(<OnSpotZones />);
    fireEvent.click(await screen.findByRole("button", { name: "Выйти из зоны " + zone.name }));
    await screen.findByRole("alert");
    expect(screen.getByText("Ты участвуешь в чате зоны")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Выйти из зоны " + zone.name })).toBeEnabled();
  });
  it("does not mistake API failure for an empty catalog and supports retry", async () => {
    mocks.catalog.mockRejectedValueOnce(new Error("Catalog unavailable"));
    render(<OnSpotZones />);
    await screen.findByRole("alert");
    expect(screen.queryByText(/Проверенные локальные зоны ещё не открыты/)).not.toBeInTheDocument();
    mocks.catalog.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole("button", { name: "Обновить зоны" }));
    await screen.findByText(/Проверенные локальные зоны ещё не открыты/);
  });
  it.each([null, { id: "unconfirmed" }, { ...actor, is_anonymous: true }])(
    "does not fetch zones for a guest/unconfirmed/anonymous user",
    async (user) => {
      mocks.getUser.mockResolvedValue({ data: { user }, error: null });
      render(<OnSpotZones />);
      await screen.findByRole("link", { name: "Войти в подтверждённый аккаунт" });
      expect(mocks.catalog).not.toHaveBeenCalled();
      expect(mocks.membership).not.toHaveBeenCalled();
    },
  );
  it("does not run the STAGING feature outside STAGING", async () => {
    mocks.allowed = false;
    render(<OnSpotZones />);
    await screen.findByText("Локальные зоны пока не открыты.");
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.catalog).not.toHaveBeenCalled();
  });
  it("clears old private state and discards a late catalog after an identity change", async () => {
    let resolve!: (v: unknown) => void;
    mocks.catalog.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<OnSpotZones />);
    await waitFor(() => expect(mocks.catalog).toHaveBeenCalledWith(actor.id));
    mocks.catalog.mockResolvedValueOnce([]);
    act(() =>
      mocks.auth!("SIGNED_IN", { user: { id: "other-actor", email_confirmed_at: "2026-01-01" } }),
    );
    await screen.findByText(/Проверенные локальные зоны ещё не открыты/);
    await act(async () => resolve([{ ...zone, is_member: true }]));
    expect(screen.queryByText(zone.name)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Открыть чат/ })).not.toBeInTheDocument();
  });
  it("does not reload or get stuck loading after a token refresh of the same actor", async () => {
    render(<OnSpotZones />);
    await screen.findByText(zone.name);
    act(() => mocks.auth!("TOKEN_REFRESHED", { user: actor }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(mocks.catalog).toHaveBeenCalledTimes(1);
  });
});
