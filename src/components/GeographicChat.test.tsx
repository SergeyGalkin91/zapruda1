import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeographicChat } from "@/routes/chat";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  invoke: vi.fn(),
  from: vi.fn(),
  prepare: vi.fn(),
  remove: vi.fn(),
  navigate: vi.fn(),
  createURL: vi.fn(),
  revokeURL: vi.fn(),
  callbacks: new Map<string, () => void>(),
  subscriptions: [] as Array<(status: string) => void>,
  rows: [] as Array<{ id: string; user_id: string; body: string; created_at: string }>,
  photos: [] as Array<{ id: string; message_id: string }>,
  place: "10000000-0000-4000-8000-000000000081",
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({
    ...options,
    useSearch: () => ({ place: mocks.place, topic: "general", country: "RU" }),
  }),
  useNavigate: () => mocks.navigate,
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/Shell", () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/lib/report-photo", () => ({ prepareReportPhoto: mocks.prepare }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser, getSession: mocks.getSession },
    from: mocks.from,
    rpc: async () => ({ data: [], error: null }),
    functions: { invoke: mocks.invoke },
    removeChannel: mocks.remove,
    channel: () => {
      const channel = {
        on: (_event: string, filter: { table: string }, callback: () => void) => {
          mocks.callbacks.set(filter.table, callback);
          return channel;
        },
        subscribe: (callback?: (status: string) => void) => {
          if (callback) mocks.subscriptions.push(callback);
          return channel;
        },
      };
      return channel;
    },
  },
}));
const actor = {
  id: "00000000-0000-4000-8000-000000000081",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  is_anonymous: false,
};
const firstMessage = {
  id: "20000000-0000-4000-8000-000000000081",
  user_id: actor.id,
  body: "Offline persisted message",
  created_at: "2026-01-01T00:00:00Z",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.callbacks.clear();
  mocks.subscriptions.length = 0;
  mocks.rows = [firstMessage];
  mocks.photos = [];
  mocks.getUser.mockResolvedValue({ data: { user: actor }, error: null });
  mocks.getSession.mockResolvedValue({
    data: { session: { user: actor, access_token: "offline-owner-token" } },
    error: null,
  });
  mocks.prepare.mockResolvedValue(new Blob(["offline sanitized pixels"], { type: "image/jpeg" }));
  mocks.createURL.mockReturnValue("blob:offline-chat-photo");
  vi.stubGlobal(
    "URL",
    class extends URL {
      static override createObjectURL = mocks.createURL;
      static override revokeObjectURL = mocks.revokeURL;
    },
  );
  mocks.invoke.mockImplementation(async (name: string, options: { body?: FormData }) => ({
    data: name.startsWith("chat-photo-access")
      ? new Blob(["offline jpeg"], { type: "image/jpeg" })
      : { photo_id: options.body?.get("photo_id") },
    error: null,
  }));
  mocks.from.mockImplementation((table: string) => {
    const result = () => ({
      data:
        table === "chat_places"
          ? [
              {
                id: mocks.place,
                parent_id: null,
                level: "country",
                country_code: "RU",
                name: "Россия",
                created_by: null,
              },
            ]
          : table === "chat_messages"
            ? mocks.rows
            : table === "chat_message_photos"
              ? mocks.photos
              : [],
      error: null,
    });
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      in: vi.fn(),
      insert: vi.fn(),
      single: async () => ({ data: { id: firstMessage.id }, error: null }),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    for (const method of [query.select, query.eq, query.order, query.limit, query.in, query.insert])
      method.mockReturnValue(query);
    return query;
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function open() {
  const view = render(<GeographicChat />);
  await screen.findByText(firstMessage.body);
  const composer = screen.getByLabelText("Сообщение для выбранной ветки");
  await waitFor(() => expect(composer).not.toBeDisabled());
  return { ...view, composer };
}
describe("Geographic chat (offline component regressions, not real JWT)", () => {
  it("reconciles messages missed before database readiness or during reconnect, keeping the draft", async () => {
    const { composer } = await open();
    fireEvent.change(composer, { target: { value: "Unsent private draft" } });
    const status = mocks.subscriptions.at(-1)!;
    mocks.rows = [{ ...firstMessage, body: "Arrived while replication was starting" }];
    await act(async () => status("SUBSCRIBED"));
    await screen.findByText("Arrived while replication was starting");
    expect(composer).toHaveValue("Unsent private draft");
    await act(async () => status("CHANNEL_ERROR"));
    mocks.rows = [{ ...firstMessage, body: "Arrived during reconnect" }];
    await act(async () => status("SUBSCRIBED"));
    await screen.findByText("Arrived during reconnect");
    expect(composer).toHaveValue("Unsent private draft");
  });
  it("refreshes messages/photos/reactions without losing the user's unfinished text", async () => {
    const { composer } = await open();
    fireEvent.change(composer, { target: { value: "Private unfinished text" } });
    expect([...mocks.callbacks.keys()].sort()).toEqual([
      "chat_message_photos",
      "chat_message_reactions",
      "chat_messages",
    ]);
    mocks.rows = [{ ...firstMessage, body: "Updated persisted message" }];
    await act(async () => mocks.callbacks.get("chat_message_reactions")!());
    await screen.findByText("Updated persisted message");
    expect(composer).toHaveValue("Private unfinished text");
  });
  it("uses authenticated Blob transport and releases downloaded photo URLs on unmount", async () => {
    mocks.photos = [{ id: "30000000-0000-4000-8000-000000000081", message_id: firstMessage.id }];
    const { unmount } = await open();
    await screen.findByAltText("Фото из рыболовного чата");
    expect(mocks.invoke).toHaveBeenCalledWith(
      expect.stringContaining("chat-photo-access?photo_id="),
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer offline-owner-token" },
      }),
    );
    unmount();
    expect(mocks.revokeURL).toHaveBeenCalledWith("blob:offline-chat-photo");
    expect(mocks.remove).toHaveBeenCalled();
  });
  it("does not send prepared photo bytes after the prior account's route unmounts", async () => {
    let complete: (v: Blob) => void = () => {};
    mocks.prepare.mockImplementation(
      () =>
        new Promise<Blob>((resolve) => {
          complete = resolve;
        }),
    );
    const { composer, container, unmount } = await open();
    fireEvent.change(composer, { target: { value: "Offline photo draft" } });
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["offline source"], "private.jpg", { type: "image/jpeg" })] },
    });
    fireEvent.submit(composer.closest("form")!);
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => complete(new Blob(["offline pixels"], { type: "image/jpeg" })));
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
