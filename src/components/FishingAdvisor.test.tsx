import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FishingAdvisor } from "./FishingAdvisor";

type AuthObserver = (callback: (event: string, session: unknown) => void) => {
  data: { subscription: { unsubscribe: () => void } };
};
const mocks = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<{ data: { user: unknown } }>>(),
  onAuth: vi.fn<AuthObserver>(),
  invoke: vi.fn(),
  from: vi.fn(),
  history: vi.fn(),
  preferences: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser, onAuthStateChange: mocks.onAuth },
    from: mocks.from,
    functions: { invoke: mocks.invoke },
  },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
const user = {
  id: "10000000-0000-4000-8000-000000000001",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  is_anonymous: false,
};
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const answer = "Synthetic successful AI advice long enough for the actual response validation.";
const fill = (place = "Ока") =>
  fireEvent.change(screen.getByRole("textbox", { name: "Водоём / примерное место" }), {
    target: { value: place },
  });
const makePlan = () => fireEvent.click(screen.getByRole("button", { name: "Составить план" }));
const plan = () => screen.getByRole("region", { name: "План по правилам" });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user } });
  mocks.onAuth.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mocks.history.mockResolvedValue({ data: [], error: null });
  mocks.preferences.mockResolvedValue({ data: null, error: null });
  mocks.from.mockImplementation(() => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: mocks.history,
      maybeSingle: mocks.preferences,
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    return query;
  });
  mocks.invoke.mockResolvedValue({
    data: null,
    error: { context: new Response("{}", { status: 502 }) },
  });
});
afterEach(cleanup);

describe("Fishing advisor availability and source integrity", () => {
  it("creates a local plan while Auth is still unavailable", async () => {
    mocks.getUser.mockReturnValue(new Promise(() => {}));
    render(<FishingAdvisor />);
    fill();
    makePlan();
    expect(plan()).toHaveTextContent("Источник: правила ZAPRUDA · без генерации ИИ");
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("creates a guest plan without a ИИ request or journal write", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    render(<FishingAdvisor />);
    await screen.findByRole("link", { name: "войди в аккаунт" });
    fill();
    makePlan();
    expect(plan()).toHaveTextContent("Первые 30 минут");
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("keeps the plan, inputs and form usable after invalid-key rejection", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(
          JSON.stringify({ code: "XAI_INVALID_API_KEY", error: "PRIVATE_DIAGNOSTIC" }),
          { status: 502 },
        ),
      },
    });
    render(<FishingAdvisor />);
    fill();
    const grok = await screen.findByRole("button", { name: "Добавить совет ИИ" });
    fireEvent.click(grok);
    await screen.findByText(
      "ИИ временно недоступен. План по правилам готов — им можно пользоваться.",
    );
    expect(plan()).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE_DIAGNOSTIC|XAI_INVALID_API_KEY/)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Совет ИИ за сегодня" })).not.toBeInTheDocument();
    fill("Волга");
    makePlan();
    expect(plan()).toHaveTextContent("Волга");
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(grok).toBeEnabled();
  });
  it("keeps local planning available while a ИИ request is pending", async () => {
    let complete: (value: { data: unknown; error: unknown }) => void = () => {};
    mocks.invoke.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    render(<FishingAdvisor />);
    fill("Ока");
    fireEvent.click(await screen.findByRole("button", { name: "Добавить совет ИИ" }));
    await screen.findByRole("button", { name: "ИИ готовит дополнение…" });
    fill("Волга");
    makePlan();
    expect(plan()).toHaveTextContent("Волга");
    await act(async () => complete({ data: { answer, already_used: false }, error: null }));
    expect(plan()).toHaveTextContent("Волга");
    expect(screen.getByRole("region", { name: "Совет ИИ за сегодня" })).toHaveTextContent("Ока");
    expect(screen.getByRole("textbox", { name: "Водоём / примерное место" })).toHaveValue("Волга");
  });
  it.each(["ready", "failed"] as const)(
    "preserves the ИИ %s quota while keeping local planning",
    async (status) => {
      mocks.history.mockResolvedValue({
        data: [
          {
            id: "offline-log",
            advice_day: today(),
            status,
            attempts: 3,
            answer: status === "ready" ? answer : "",
            prompt_summary: "OLD_REQUEST",
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      });
      render(<FishingAdvisor />);
      fill();
      const grok = await screen.findByRole("button", {
        name:
          status === "ready"
            ? "Совет ИИ на сегодня получен"
            : "Запросы ИИ на сегодня приостановлены",
      });
      expect(grok).toBeDisabled();
      makePlan();
      expect(plan()).toBeVisible();
      expect(mocks.invoke).not.toHaveBeenCalled();
    },
  );
  it("contains a rejected journal lookup", async () => {
    mocks.history.mockRejectedValue(new Error("PRIVATE_HISTORY_DIAGNOSTIC"));
    render(<FishingAdvisor />);
    fill();
    makePlan();
    await screen.findByText("Журнал ИИ временно недоступен. План по правилам работает.");
    expect(plan()).toBeVisible();
    expect(screen.queryByText(/PRIVATE_HISTORY_DIAGNOSTIC/)).not.toBeInTheDocument();
  });
  it("escapes user notes in the local plan", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    render(<FishingAdvisor />);
    await screen.findByRole("link", { name: "войди в аккаунт" });
    fill();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Что известно о месте (необязательно)" }),
      { target: { value: '<img src=x onerror="alert(1)">' } },
    );
    makePlan();
    expect(plan()).toHaveTextContent('<img src=x onerror="alert(1)">');
    expect(within(plan()).queryByRole("img")).not.toBeInTheDocument();
  });
  it("discards personal state and a late response after sign-out", async () => {
    let complete: (value: { data: unknown; error: unknown }) => void = () => {};
    mocks.invoke.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    render(<FishingAdvisor />);
    fill("PRIVATE_OLD_PLACE");
    fireEvent.click(await screen.findByRole("button", { name: "Добавить совет ИИ" }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
    act(() => mocks.onAuth.mock.calls[0]?.[0]("SIGNED_OUT", null));
    await act(async () =>
      complete({ data: { answer: "PRIVATE_OLD_ANSWER_" + answer }, error: null }),
    );
    expect(screen.queryByRole("region", { name: "План по правилам" })).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE_OLD_ANSWER|PRIVATE_OLD_PLACE/)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Водоём / примерное место" })).toHaveValue("");
    fill("Новый водоём");
    makePlan();
    expect(plan()).toBeVisible();
  });
});
