import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpotVerifiedProgress } from "./SpotVerifiedProgress";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), action: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: mocks.getUser } },
}));
vi.mock("@/lib/spot-api", () => ({ isSpotStaging: () => true, spotAction: mocks.action }));
const empty = { catches: [], titles: [], history: [] };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "current-actor", email_confirmed_at: "2026-01-01", is_anonymous: false } },
  });
  mocks.action.mockResolvedValue({ progress: empty });
});
afterEach(cleanup);
describe("authoritative profile progress (offline component regression, not JWT acceptance)", () => {
  it("shows a pending fish without awarding a crown", async () => {
    mocks.action.mockResolvedValue({
      progress: {
        ...empty,
        catches: [{ catch_id: "one", species: "pike", weight_g: 1000, status: "pending" }],
      },
    });
    render(<SpotVerifiedProgress />);
    await screen.findByText("На независимой проверке");
    expect(screen.queryByRole("list", { name: "Действующие KING-титулы" })).not.toBeInTheDocument();
    expect(mocks.action).toHaveBeenCalledWith("current-actor", "progress");
  });
  it("removes an actual server title after a revocation refresh", async () => {
    mocks.action.mockResolvedValueOnce({
      progress: {
        ...empty,
        titles: [
          {
            category_id: "category",
            catch_id: "one",
            nomination: "spot-big-fish",
            score: 1000,
            unit: "g",
          },
        ],
      },
    });
    render(<SpotVerifiedProgress />);
    await screen.findByRole("list", { name: "Действующие KING-титулы" });
    act(() => window.dispatchEvent(new Event("zapruda:spot-progress-changed")));
    await screen.findByText("Действующих подтверждённых титулов пока нет.");
    expect(screen.queryByRole("list", { name: "Действующие KING-титулы" })).not.toBeInTheDocument();
  });
  it("distinguishes a failed read from an empty result and permits a retry", async () => {
    mocks.action.mockRejectedValueOnce(new Error("Unavailable"));
    render(<SpotVerifiedProgress />);
    await screen.findByRole("alert");
    expect(
      screen.queryByText("Действующих подтверждённых титулов пока нет."),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Обновить статус" }));
    await screen.findByText("Действующих подтверждённых титулов пока нет.");
  });
  it("does not request private progress for an unconfirmed or anonymous actor", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "unconfirmed", email_confirmed_at: null } },
    });
    render(<SpotVerifiedProgress />);
    await screen.findByRole("link", { name: "Войти в подтверждённый аккаунт" });
    expect(mocks.action).not.toHaveBeenCalled();
  });
  it("discards a late response after the containing identity boundary unmounts", async () => {
    let resolve!: (value: unknown) => void;
    mocks.action.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const old = render(<SpotVerifiedProgress />);
    await screen.findByRole("button", { name: "Обновить статус" });
    old.unmount();
    mocks.action.mockResolvedValue({ progress: empty });
    render(<SpotVerifiedProgress />);
    await screen.findByText("Действующих подтверждённых титулов пока нет.");
    await act(async () =>
      resolve({
        progress: {
          ...empty,
          titles: [
            { category_id: "old-private", nomination: "spot-big-fish", score: 999, unit: "g" },
          ],
        },
      }),
    );
    expect(screen.queryByRole("list", { name: "Действующие KING-титулы" })).not.toBeInTheDocument();
  });
});
