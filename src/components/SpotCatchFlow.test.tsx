import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpotCatchFlow } from "./SpotCatchFlow";
type AuthObserver = (callback: (event: string, session: { user: unknown } | null) => void) => {
  data: { subscription: { unsubscribe: () => void } };
};
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  onAuth: vi.fn<AuthObserver>(),
  invoke: vi.fn(),
  from: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser, getSession: mocks.getSession, onAuthStateChange: mocks.onAuth },
    functions: { invoke: mocks.invoke },
    from: mocks.from,
  },
}));
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  is_anonymous: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://yudtbifopfnjtjanaqrd.supabase.co");
  mocks.getUser.mockResolvedValue({ data: { user } });
  mocks.getSession.mockResolvedValue({
    data: { session: { user, access_token: "offline-token-fixture" } },
    error: null,
  });
  mocks.onAuth.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: mocks.limit };
  for (const method of [query.select, query.eq, query.order]) method.mockReturnValue(query);
  mocks.limit.mockResolvedValue({ data: [], error: null });
  mocks.from.mockReturnValue(query);
  mocks.invoke.mockImplementation(
    async (_name: string, { body }: { body: { action: string } }) => ({
      data:
        body.action === "mine"
          ? { catches: [] }
          : {
              notifications: [
                {
                  id: 1,
                  message: "PRIVATE_PREVIOUS_ACCOUNT_NOTICE",
                  created_at: "2026-01-01T00:00:00Z",
                },
              ],
            },
      error: null,
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
describe("SPOT personal-state boundaries (offline component tests, not signed-JWT E2E)", () => {
  it("keeps catch data and the chosen photo when stepping back before submission", async () => {
    mocks.limit.mockResolvedValue({
      data: [
        { id: "approved-fixture", name: "Offline fixture", city: "", disciplines: ["street"] },
      ],
      error: null,
    });
    render(<SpotCatchFlow />);
    await screen.findByRole("option", { name: /Offline fixture/ });
    fireEvent.change(screen.getByLabelText("Проверенный спот"), {
      target: { value: "approved-fixture" },
    });
    fireEvent.change(screen.getByLabelText("Вес одной рыбы, г"), { target: { value: "620" } });
    fireEvent.change(screen.getByLabelText("Длина, мм"), { target: { value: "380" } });
    fireEvent.change(screen.getByLabelText("Дата и время поимки"), {
      target: { value: "2026-11-05T16:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Далее" }));
    await screen.findByRole("heading", { name: /Фото и подтверждение/ });
    const photo = screen.getByLabelText(/Фото рыбы и измерения/);
    const proof = new File(["offline fixture"], "proof.jpg", { type: "image/jpeg" });
    fireEvent.change(photo, { target: { files: [proof] } });
    fireEvent.click(screen.getByRole("button", { name: "Назад" }));
    expect(screen.getByLabelText("Вес одной рыбы, г")).toHaveValue(620);
    fireEvent.click(screen.getByRole("button", { name: "Далее" }));
    expect(screen.getByLabelText(/Фото рыбы и измерения/)).toBe(photo);
    expect(screen.getByRole("button", { name: "Отправить на проверку" })).toBeEnabled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("clears private inbox and proof state when the account signs out", async () => {
    render(<SpotCatchFlow />);
    fireEvent.click(await screen.findByRole("button", { name: "Мои уловы и уведомления" }));
    await screen.findByText("PRIVATE_PREVIOUS_ACCOUNT_NOTICE");
    act(() => mocks.onAuth.mock.calls[0]?.[0]("SIGNED_OUT", null));
    expect(screen.queryByText("PRIVATE_PREVIOUS_ACCOUNT_NOTICE")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Мои уловы и уведомления" }),
    ).not.toBeInTheDocument();
  });
  it("does not show a previous account's late catches/inbox response", async () => {
    const pending: Array<(value: unknown) => void> = [];
    mocks.invoke.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    render(<SpotCatchFlow />);
    fireEvent.click(await screen.findByRole("button", { name: "Мои уловы и уведомления" }));
    await waitFor(() => expect(pending).toHaveLength(2));
    act(() =>
      mocks.onAuth.mock.calls[0]?.[0]("SIGNED_IN", {
        user: { ...user, id: "00000000-0000-4000-8000-000000000002" },
      }),
    );
    await act(async () => {
      pending[0]?.({
        data: { catches: [{ catch_id: "PRIVATE_OLD_CATCH", species: "PRIVATE_OLD_SPECIES" }] },
        error: null,
      });
      pending[1]?.({
        data: { notifications: [{ id: 1, message: "PRIVATE_PREVIOUS_ACCOUNT_NOTICE" }] },
        error: null,
      });
    });
    expect(screen.queryByText(/PRIVATE_OLD|PRIVATE_PREVIOUS/)).not.toBeInTheDocument();
  });
  it("preserves a draft across a token refresh for the same account", async () => {
    render(<SpotCatchFlow />);
    await screen.findByRole("button", { name: "Мои уловы и уведомления" });
    const weight = screen.getByLabelText("Вес одной рыбы, г");
    fireEvent.change(weight, { target: { value: "123" } });
    act(() => mocks.onAuth.mock.calls[0]?.[0]("TOKEN_REFRESHED", { user }));
    expect(weight).toHaveValue(123);
  });
  it("does not send a previous account's action with a different account's token", async () => {
    render(<SpotCatchFlow />);
    const inbox = await screen.findByRole("button", { name: "Мои уловы и уведомления" });
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: { ...user, id: "00000000-0000-4000-8000-000000000002" },
          access_token: "different-offline-token-fixture",
        },
      },
      error: null,
    });
    fireEvent.click(inbox);
    await screen.findByText("Не удалось обновить уловы и уведомления. Попробуй ещё раз.");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
