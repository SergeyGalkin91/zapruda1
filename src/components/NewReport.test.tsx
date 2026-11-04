import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NewReport } from "@/routes/reports.new";
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
async function fillReport() {
  const view = render(<NewReport />);
  await waitFor(() =>
    expect(localStorage.getItem("zapruda-report-draft-v1-offline-account-a")).not.toBeNull(),
  );
  fireEvent.change(screen.getByLabelText(/Название отчёта/), {
    target: { value: "Private offline draft" },
  });
  const discipline = screen.getByLabelText(/Вид рыбалки для достижений/) as HTMLSelectElement;
  fireEvent.change(discipline, { target: { value: discipline.options[1]!.value } });
  const submit = screen.getByRole("button", { name: "Опубликовать отчёт" });
  return { ...view, form: submit.closest("form")! };
}
describe("Report publication safety (offline UI, not signed-JWT E2E)", () => {
  it("keeps the draft when the atomic catch transaction fails after a successful preflight", async () => {
    const { form } = await fillReport();
    const original = mocks.from.getMockImplementation()!;
    mocks.from.mockImplementation((table: string) =>
      table === "catches"
        ? { select: () => ({ limit: async () => ({ data: [], error: null }) }) }
        : original(table),
    );
    fireEvent.change(screen.getByPlaceholderText("Вид (щука, окунь…)"), {
      target: { value: "Окунь" },
    });
    fireEvent.submit(form);
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
    fireEvent.change(screen.getByPlaceholderText("Вид (щука, окунь…)"), {
      target: { value: "Окунь" },
    });
    fireEvent.submit(view.form);
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
    fireEvent.submit(screen.getByRole("button", { name: "Опубликовать отчёт" }).closest("form")!);
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
    const { form } = await fillReport();
    fireEvent.change(screen.getByPlaceholderText("Вид (щука, окунь…)"), {
      target: { value: "Окунь" },
    });
    fireEvent.submit(form);
    await screen.findByText("Публикация временно недоступна. Черновик сохранён — попробуй позже.");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalledWith("fishing_reports");
    expect(screen.getByLabelText(/Название отчёта/)).toHaveValue("Private offline draft");
    expect(localStorage.getItem("zapruda-report-draft-v1-offline-account-a")).toContain(
      "Private offline draft",
    );
  });
  it("allows an explicitly empty catch log without accessing the unavailable catch store", async () => {
    const { form } = await fillReport();
    fireEvent.submit(form);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" }));
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith(
      "fishing_reports",
      expect.objectContaining({ user_id: user.id, title: "Private offline draft" }),
    );
    expect(mocks.from).not.toHaveBeenCalledWith("catches");
  });
  it("does not publish one account's draft as a newly signed-in account", async () => {
    const { form } = await fillReport();
    mocks.getUser.mockResolvedValue({
      data: { user: { ...user, id: "offline-account-b" } },
      error: null,
    });
    fireEvent.submit(form);
    await screen.findByText("Сессия изменилась. Открой отчёт из своего аккаунта.");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalledWith("fishing_reports");
  });
  it("stops the old publication continuation after the route unmounts", async () => {
    const { form, unmount } = await fillReport();
    let complete: (value: unknown) => void = () => {};
    mocks.getUser.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    fireEvent.submit(form);
    unmount();
    await act(async () => complete({ data: { user }, error: null }));
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalledWith("fishing_reports");
  });
});
