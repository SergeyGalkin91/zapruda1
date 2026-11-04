import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SocialMeetups } from "./SocialMeetups";

const mock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mock.from, rpc: mock.rpc, auth: { getUser: mock.getUser } },
}));

type Row = Record<string, string | null>;
type Result = { data: Row[] | Row | null; error: { message: string } | null };
type Tables = {
  meetup_posts: Row[];
  meetup_members: Row[];
  meetup_private_details: Row[];
  meetup_messages: Row[];
};
const owner = "test-owner";
let rows: Tables;
let delayedDetails: Map<string, Promise<Result>>;
let tick: (() => void) | undefined;
let written: Row[];

class Query implements PromiseLike<Result> {
  private filters = new Map<string, string>();
  private ordering: [string, boolean][] = [];
  private cap = Infinity;
  private mutation: { type: string; row: Row } | undefined;
  constructor(private table: keyof Tables) {}
  select() {
    return this;
  }
  eq(column: string, value: string) {
    this.filters.set(column, value);
    return this;
  }
  order(column: string, options: { ascending: boolean }) {
    this.ordering.push([column, options.ascending]);
    return this;
  }
  limit(cap: number) {
    this.cap = cap;
    return this;
  }
  insert(row: Row) {
    this.mutation = { type: "insert", row };
    return this;
  }
  upsert(row: Row) {
    this.mutation = { type: "upsert", row };
    return this;
  }
  async execute(single = false): Promise<Result> {
    if (this.mutation) {
      const row = this.mutation.row;
      if (this.table === "meetup_messages")
        rows[this.table].push({ ...row, id: "999", created_at: "2026-11-04T12:00:00Z" });
      if (this.table === "meetup_private_details") written.push(row);
      return { data: null, error: null };
    }
    const id = this.filters.get("post_id");
    if (this.table === "meetup_private_details" && id && delayedDetails.has(id))
      return delayedDetails.get(id)!;
    const data = (rows[this.table] ?? []).filter((row) =>
      [...this.filters].every(([key, value]) => row[key] === value),
    );
    data.sort((a, b) => {
      for (const [key, ascending] of this.ordering) {
        const cmp = String(a[key]).localeCompare(String(b[key]));
        if (cmp) return ascending ? cmp : -cmp;
      }
      return 0;
    });
    return {
      data: single
        ? data[0]
          ? { ...data[0] }
          : null
        : data.slice(0, this.cap).map((row) => ({ ...row })),
      error: null,
    };
  }
  maybeSingle() {
    return this.execute(true);
  }
  then<A = Result, B = never>(
    resolve?: ((value: Result) => A | PromiseLike<A>) | null,
    reject?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ) {
    return this.execute().then(resolve, reject);
  }
}

beforeEach(() => {
  tick = undefined;
  delayedDetails = new Map();
  written = [];
  rows = {
    meetup_posts: ["a", "b"].map((id) => ({
      id,
      owner_id: owner,
      country_code: "RU",
      region_code: "Нижегородская область",
      city_code: "Нижний Новгород",
      title: `Выезд ${id}`,
      description: "Тестовый сценарий",
      status: "open",
      created_at: id,
    })),
    meetup_members: ["a", "b"].map((id) => ({
      post_id: id,
      user_id: owner,
      role: "owner",
      status: "accepted",
    })),
    meetup_private_details: ["a", "b"].map((id) => ({
      post_id: id,
      private_place: `Место ${id}`,
      meeting_at: "2026-11-03T16:00:00.000Z",
    })),
    meetup_messages: Array.from({ length: 150 }, (_, i) => ({
      id: String(i + 1).padStart(3, "0"),
      post_id: "a",
      sender_id: owner,
      body: `сообщение-${i + 1}`,
      created_at: new Date(Date.UTC(2026, 10, 3, 10, i)).toISOString(),
    })),
  };
  mock.getUser.mockResolvedValue({ data: { user: { id: owner } }, error: null });
  mock.from.mockImplementation((table: keyof Tables) => new Query(table));
  mock.rpc.mockResolvedValue({ data: 1, error: null });
  const original = window.setInterval.bind(window);
  vi.spyOn(window, "setInterval").mockImplementation(((callback: () => void, ms: number) => {
    if (ms === 10000) {
      tick = callback;
      return 12345;
    }
    return original(callback, ms);
  }) as typeof window.setInterval);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

async function setup() {
  render(<SocialMeetups />);
  fireEvent.change(screen.getByLabelText("Страна (код)"), { target: { value: "RU" } });
  fireEvent.change(screen.getByLabelText("Регион"), { target: { value: "Нижегородская область" } });
  fireEvent.change(screen.getByLabelText("Город"), { target: { value: "Нижний Новгород" } });
  await screen.findByRole("heading", { name: "Выезд a" });
}
function open(id: string) {
  const card = screen.getByRole("heading", { name: `Выезд ${id}` }).closest("article")!;
  fireEvent.click(within(card).getByRole("button", { name: "Частный чат" }));
}

describe("meetup chat regression", () => {
  it("loads the most recent 100 messages and displays them chronologically", async () => {
    await setup();
    open("a");
    await screen.findByText("Вы: сообщение-150");
    expect(screen.queryByText("Вы: сообщение-1")).toBeNull();
    const messages = screen.getAllByText(/^Вы: сообщение-/);
    expect(messages).toHaveLength(100);
    expect(messages[0]).toHaveTextContent("Вы: сообщение-51");
    expect(messages[99]).toHaveTextContent("Вы: сообщение-150");
  });
  it("refreshes messages from another participant without reopening or resetting edits", async () => {
    await setup();
    open("a");
    await screen.findByText("Вы: сообщение-150");
    fireEvent.change(screen.getByPlaceholderText("Точное место встречи"), {
      target: { value: "Несохранённое уточнение" },
    });
    rows.meetup_messages.push({
      id: "151",
      post_id: "a",
      sender_id: "another-test-user",
      body: "Уже на месте",
      created_at: "2026-11-04T12:00:00Z",
    });
    await act(async () => {
      tick!();
    });
    await screen.findByText("Участник: Уже на месте");
    expect(screen.getByPlaceholderText("Точное место встречи")).toHaveValue(
      "Несохранённое уточнение",
    );
  });
  it("does not apply details from a previous meetup after switching", async () => {
    await setup();
    let resolve!: (result: Result) => void;
    delayedDetails.set(
      "a",
      new Promise<Result>((done) => {
        resolve = done;
      }),
    );
    open("a");
    open("b");
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Точное место встречи")).toHaveValue("Место b"),
    );
    await act(async () => resolve({ data: rows.meetup_private_details[0] ?? null, error: null }));
    expect(screen.getByPlaceholderText("Точное место встречи")).toHaveValue("Место b");
    expect(screen.queryByText("Вы: сообщение-150")).toBeNull();
  });
  it("clears cached private details and messages if membership is revoked", async () => {
    await setup();
    open("a");
    await screen.findByText("Вы: сообщение-150");
    rows.meetup_members[0]!["status"] = "declined";
    await act(async () => {
      tick!();
    });
    await screen.findByText(/Доступ к чату сходки больше не подтверждён/);
    expect(screen.queryByText("Место a")).toBeNull();
    expect(screen.queryByText("Вы: сообщение-150")).toBeNull();
    expect(screen.queryByPlaceholderText("Точное место встречи")).toBeNull();
  });
  it("sends a new message without overwriting unsaved private details", async () => {
    await setup();
    open("a");
    await screen.findByText("Вы: сообщение-150");
    fireEvent.change(screen.getByPlaceholderText("Точное место встречи"), {
      target: { value: "Мой черновик места" },
    });
    fireEvent.change(screen.getByPlaceholderText("Сообщение"), {
      target: { value: "Новое сообщение" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
    await screen.findByText("Вы: Новое сообщение");
    expect(screen.getByPlaceholderText("Точное место встречи")).toHaveValue("Мой черновик места");
  });
  it("preserves the original UTC instant when the organizer saves unchanged details", async () => {
    await setup();
    open("a");
    await screen.findByText("Вы: сообщение-150");
    fireEvent.click(screen.getByRole("button", { name: "Сохранить место и время" }));
    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]?.["meeting_at"]).toBe("2026-11-03T16:00:00.000Z");
  });
});
