import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NewReport } from "@/routes/reports.new";
import { streetStorageKey } from "@/lib/street-storage";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  invoke: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  rpc: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/components/Shell", () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser, getSession: mocks.getSession },
    functions: { invoke: mocks.invoke },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));
const user = {
  id: "offline-account-a",
  is_anonymous: false,
  email_confirmed_at: "2026-01-01T00:00:00Z",
};
const rpcReply = (value: unknown) => {
  const pending = Promise.resolve(value);
  return Object.assign(pending, { setHeader: vi.fn(() => pending) });
};
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
  mocks.rpc.mockImplementation(() => rpcReply({ data: null, error: { code: "OFFLINE_FIXTURE" } }));
  mocks.getSession.mockResolvedValue({
    data: { session: { user, access_token: "offline-token-fixture" } },
    error: null,
  });
  vi.stubGlobal(
    "URL",
    class extends URL {
      static override createObjectURL = vi.fn(() => "blob:offline-photo-fixture");
      static override revokeObjectURL = vi.fn();
    },
  );
  mocks.from.mockImplementation((name: string) => {
    const result = {
      data: [],
      error:
        name === "catches" ? { code: "PGRST205", message: "Offline missing-table fixture" } : null,
    };
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      setHeader: vi.fn(),
      limit: vi.fn(async () => result),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
      insert: (values: unknown) => {
        mocks.insert(name, values);
        return query;
      },
      single: async () => ({ data: { id: "offline-report-id" }, error: null }),
    };
    for (const method of [query.select, query.eq, query.order, query.setHeader])
      method.mockReturnValue(query);
    return query;
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function next() {
  fireEvent.click(screen.getByRole("button", { name: "Далее" }));
}
function skip() {
  fireEvent.click(screen.getByRole("button", { name: "Пропустить" }));
}
function selectDiscipline() {
  const select = screen.getByLabelText(/Вид рыбалки для достижений/) as HTMLSelectElement;
  fireEvent.change(select, { target: { value: select.options[1]!.value } });
}
async function fillReport() {
  const view = render(<NewReport />);
  await waitFor(() =>
    expect(localStorage.getItem("zapruda-report-draft-v1-offline-account-a")).not.toBeNull(),
  );
  skip();
  skip();
  fireEvent.change(screen.getByLabelText(/Название отчёта/), {
    target: { value: "Private offline draft" },
  });
  next();
  selectDiscipline();
  next();
  return view;
}
function reachReview() {
  if (screen.queryByRole("heading", { name: "Проверь отчёт" })) return;
  const species = screen.getByLabelText("Вид рыбы") as HTMLInputElement;
  if (species.value) {
    next();
    skip();
    skip();
  } else {
    skip();
  }
  skip();
  skip();
}
function submitReport() {
  reachReview();
  fireEvent.click(screen.getByRole("button", { name: "Опубликовать отчёт" }));
}
describe("Report publication safety (offline UI, not signed-JWT E2E)", () => {
  it("imports STREET notes and catches with real line breaks into a private unpublished draft", async () => {
    localStorage.setItem(
      streetStorageKey(user.id),
      JSON.stringify({
        startedAt: "2026-11-04T10:00:00Z",
        finishedAt: "2026-11-04T10:10:00Z",
        notes: "Offline fixture notes",
        catches: [{ species: "Offline fixture fish", note: "Offline fixture lure" }],
      }),
    );
    render(<NewReport />);
    fireEvent.click(screen.getByText("Перенос из ZAPRUDA STREET"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Перенести Street-сессию" })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Перенести Street-сессию" }));
    next();
    next();
    next();
    selectDiscipline();
    next();
    next();
    skip();
    skip();
    const story = screen.getByRole("textbox", { name: "Рассказ" }) as HTMLTextAreaElement;
    expect(story.value).toContain(
      "\nЗаметки: Offline fixture notes\n• Offline fixture fish — Offline fixture lure",
    );
    expect(story.value).not.toContain("\\n");
    expect(mocks.insert).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("zapruda-report-draft-v1-" + user.id)!).isPublic).toBe(
        false,
      ),
    );
  });
  it("recovers the exact no-catch report when a committed insert loses its response", async () => {
    const original = mocks.from.getMockImplementation()!;
    let committed: Record<string, unknown> | undefined;
    mocks.from.mockImplementation((table: string) => {
      const query = original(table);
      if (table !== "fishing_reports") return query;
      let inserting = false;
      const insert = query.insert;
      query.insert = (values: Record<string, unknown>) => {
        inserting = true;
        committed = values;
        return insert(values);
      };
      query.single = async () =>
        inserting
          ? { data: null, error: { message: "Committed response lost" } }
          : { data: committed, error: null };
      return query;
    });
    await fillReport();
    submitReport();
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled());
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(committed?.["id"]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(mocks.rpc).not.toHaveBeenCalledWith("publish_report_with_catches", expect.anything());
  });
  it("names selects from their caption without including all options", async () => {
    render(<NewReport />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Далее" })).toBeEnabled());
    skip();
    skip();
    fireEvent.change(screen.getByLabelText(/Название отчёта/), { target: { value: "Draft" } });
    next();
    const discipline = await screen.findByRole("combobox", {
      name: "Вид рыбалки для достижений *",
    });
    expect(discipline).toHaveAccessibleName("Вид рыбалки для достижений *");
    expect(screen.getByLabelText("Вид рыбалки для достижений *")).toBe(discipline);
  });
  it("clears restored review fields and returns to private step one", async () => {
    localStorage.setItem(
      "zapruda-report-draft-v1-offline-account-a",
      JSON.stringify({
        step: 3,
        title: "Stored QA",
        fishedOn: "2026-11-04",
        tackle: "Stored tackle",
        fishingMethod: "feeder",
        isPublic: true,
      }),
    );
    render(<NewReport />);
    fireEvent.click(await screen.findByRole("button", { name: "Очистить черновик" }));
    expect(screen.getByLabelText("Водоём или место")).toHaveValue("");
    skip();
    expect(screen.getByLabelText("Дата рыбалки")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Далее" })).toBeTruthy();
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem("zapruda-report-draft-v1-offline-account-a")!).isPublic,
      ).toBe(false),
    );
  });
  it("reaches review without publishing and requires a separate submit click", async () => {
    await fillReport();
    reachReview();
    await screen.findByText("Проверь отчёт");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Опубликовать отчёт" }).getAttribute("type")).toBe(
      "submit",
    );
    expect((screen.getByLabelText("Опубликовать в общей ленте") as HTMLInputElement).checked).toBe(
      false,
    );
  });
  it("returns to a skipped question and edits it from review without submitting", async () => {
    await fillReport();
    reachReview();
    fireEvent.click(screen.getByRole("button", { name: "Изменить: Место" }));
    expect(screen.getByLabelText("Водоём или место")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Водоём или место"), { target: { value: "Волга" } });
    fireEvent.click(screen.getByRole("button", { name: "Готово" }));
    expect(screen.getByRole("button", { name: "Изменить: Место" })).toHaveTextContent("Волга");
    expect(screen.getByRole("heading", { name: "Private offline draft" })).toBeVisible();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("keeps the draft when the atomic catch transaction fails after a successful preflight", async () => {
    await fillReport();
    const original = mocks.from.getMockImplementation()!;
    mocks.from.mockImplementation((table: string) =>
      table === "catches"
        ? { select: () => ({ limit: async () => ({ data: [], error: null }) }) }
        : original(table),
    );
    fireEvent.change(screen.getByLabelText("Вид рыбы"), {
      target: { value: "Окунь" },
    });
    submitReport();
    await screen.findByText(
      "Не удалось сохранить отчёт с уловом. Черновик сохранён — попробуй позже.",
    );
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(localStorage.getItem("zapruda-report-draft-v1-offline-account-a")).toContain("Окунь");
  });
  it("reuses the persisted request ID after a lost transaction response and page reload", async () => {
    const view = await fillReport();
    const original = mocks.from.getMockImplementation()!;
    mocks.from.mockImplementation((table: string) =>
      table === "catches"
        ? { select: () => ({ limit: async () => ({ data: [], error: null }) }) }
        : original(table),
    );
    fireEvent.change(screen.getByLabelText("Вид рыбы"), {
      target: { value: "Окунь" },
    });
    submitReport();
    await screen.findByText(
      "Не удалось сохранить отчёт с уловом. Черновик сохранён — попробуй позже.",
    );
    const id = mocks.rpc.mock.calls[0]![1].p_report_id;
    view.unmount();
    mocks.rpc.mockImplementation(() => rpcReply({ data: id, error: null }));
    render(<NewReport />);
    await screen.findByText(
      "Черновик восстановлен на этом устройстве. Фотографии нужно добавить снова.",
    );
    submitReport();
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" }));
    expect(mocks.rpc.mock.calls[1]![1].p_report_id).toBe(id);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("does not transmit a photo after its account's route has unmounted", async () => {
    let completeBitmap: (value: unknown) => void = () => {};
    const bitmapRequest = vi.fn(
      () =>
        new Promise((resolve) => {
          completeBitmap = resolve;
        }),
    );
    vi.stubGlobal("createImageBitmap", bitmapRequest);
    const { unmount } = await fillReport();
    skip();
    skip();
    fireEvent.change(screen.getByLabelText("Выбрать фотографии с рыбалки"), {
      target: { files: [new File(["offline-image"], "private.jpg", { type: "image/jpeg" })] },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Подсказать вид рыбы по фото (ИИ)" }),
    );
    await waitFor(() => expect(bitmapRequest).toHaveBeenCalledTimes(1));
    unmount();
    const close = vi.fn();
    await act(async () => completeBitmap({ width: 10, height: 10, close }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("does not create a partial report when the required catch store is unavailable", async () => {
    await fillReport();
    fireEvent.change(screen.getByLabelText("Вид рыбы"), {
      target: { value: "Окунь" },
    });
    submitReport();
    await screen.findByText("Публикация временно недоступна. Черновик сохранён — попробуй позже.");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalledWith("fishing_reports");
    expect(screen.getByRole("heading", { name: "Private offline draft" })).toBeVisible();
    expect(localStorage.getItem("zapruda-report-draft-v1-offline-account-a")).toContain(
      "Private offline draft",
    );
  });
  it("allows an explicitly empty catch log without accessing the unavailable catch store", async () => {
    await fillReport();
    submitReport();
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" }));
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith(
      "fishing_reports",
      expect.objectContaining({ user_id: user.id, title: "Private offline draft" }),
    );
    expect(mocks.from).not.toHaveBeenCalledWith("catches");
  });
  it("does not publish one account's draft as a newly signed-in account", async () => {
    await fillReport();
    mocks.getUser.mockResolvedValue({
      data: { user: { ...user, id: "offline-account-b" } },
      error: null,
    });
    submitReport();
    await screen.findByText("Сессия изменилась. Открой отчёт из своего аккаунта.");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalledWith("fishing_reports");
  });
  it("stops the old publication continuation after the route unmounts", async () => {
    const { unmount } = await fillReport();
    let complete: (value: unknown) => void = () => {};
    mocks.getUser.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    submitReport();
    unmount();
    await act(async () => complete({ data: { user }, error: null }));
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalledWith("fishing_reports");
  });
});
