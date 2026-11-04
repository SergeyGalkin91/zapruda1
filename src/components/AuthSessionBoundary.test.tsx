import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSessionBoundary } from "./AuthSessionBoundary";
type Session = { user: { id: string } };
type AuthObserver = (callback: (event: string, session: Session | null) => void) => {
  data: { subscription: { unsubscribe: () => void } };
};
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuth: vi.fn<AuthObserver>(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuth } },
}));
let late: ((value: string) => void) | undefined;
function PrivateRouteFixture() {
  const [draft, setDraft] = useState("");
  const [privateData, setPrivateData] = useState("");
  return (
    <>
      <input aria-label="Account draft" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button onClick={() => setPrivateData("PRIVATE_PREVIOUS_ACCOUNT")}>
        Load private response
      </button>
      <button
        onClick={() => {
          late = setPrivateData;
        }}
      >
        Start delayed private query
      </button>
      <p>{privateData}</p>
    </>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({
    data: { session: { user: { id: "account-a" } } },
    error: null,
  });
  mocks.onAuth.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  late = undefined;
});
afterEach(cleanup);
describe("Route cache identity boundaries (offline UI tests, not JWT E2E)", () => {
  const start = async () => {
    const resetCache = vi.fn();
    render(
      <AuthSessionBoundary resetCache={resetCache}>
        <PrivateRouteFixture />
      </AuthSessionBoundary>,
    );
    await waitFor(() => expect(resetCache).toHaveBeenCalledTimes(1));
    return resetCache;
  };
  it("preserves an existing draft on same-account token refresh", async () => {
    const resetCache = await start();
    fireEvent.change(screen.getByLabelText("Account draft"), {
      target: { value: "keep this draft" },
    });
    act(() => mocks.onAuth.mock.calls[0]?.[0]("TOKEN_REFRESHED", { user: { id: "account-a" } }));
    expect(screen.getByLabelText("Account draft")).toHaveValue("keep this draft");
    expect(resetCache).toHaveBeenCalledTimes(1);
  });
  it.each(["signout", "different account"])(
    "clears prior private route state after %s",
    async (kind) => {
      const resetCache = await start();
      fireEvent.click(screen.getByText("Load private response"));
      expect(screen.getByText("PRIVATE_PREVIOUS_ACCOUNT")).toBeInTheDocument();
      act(() =>
        mocks.onAuth.mock.calls[0]?.[0](
          "SIGNED_OUT",
          kind === "signout" ? null : { user: { id: "account-b" } },
        ),
      );
      expect(screen.queryByText("PRIVATE_PREVIOUS_ACCOUNT")).not.toBeInTheDocument();
      expect(resetCache).toHaveBeenCalledTimes(2);
    },
  );
  it("discards a late response captured by the previous route instance", async () => {
    await start();
    fireEvent.click(screen.getByText("Start delayed private query"));
    const oldSetter = late;
    act(() => mocks.onAuth.mock.calls[0]?.[0]("SIGNED_IN", { user: { id: "account-b" } }));
    act(() => oldSetter?.("PRIVATE_PREVIOUS_ACCOUNT"));
    expect(screen.queryByText("PRIVATE_PREVIOUS_ACCOUNT")).not.toBeInTheDocument();
  });
  it("ignores a stale initial session once a newer auth event has arrived", async () => {
    let resolveSession: (value: unknown) => void = () => {};
    mocks.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );
    const resetCache = vi.fn();
    render(
      <AuthSessionBoundary resetCache={resetCache}>
        <PrivateRouteFixture />
      </AuthSessionBoundary>,
    );
    act(() => mocks.onAuth.mock.calls[0]?.[0]("SIGNED_IN", { user: { id: "account-b" } }));
    fireEvent.change(screen.getByLabelText("Account draft"), { target: { value: "new account" } });
    await act(async () =>
      resolveSession({ data: { session: { user: { id: "account-a" } } }, error: null }),
    );
    expect(screen.getByLabelText("Account draft")).toHaveValue("new account");
    expect(resetCache).toHaveBeenCalledTimes(1);
  });
});
