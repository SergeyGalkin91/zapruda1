import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Profile } from "@/routes/profile";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), secured: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => options,
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/Shell", () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/FishingProgressTree", () => ({ FishingProgressTree: () => null }));
vi.mock("@/components/FishingDisciplineTree", () => ({ FishingDisciplineTree: () => null }));
vi.mock("@/components/AnglerTackleCabinet", () => ({ AnglerTackleCabinet: () => null }));
vi.mock("@/components/PrivateFishingMarks", () => ({ PrivateFishingMarks: () => null }));
vi.mock("@/components/ActivityAchievements", () => ({ ActivityAchievements: () => null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({
        data: {
          user: { id: "offline-owner", email: "offline@example.invalid", user_metadata: {} },
        },
        error: null,
      }),
    },
    rpc: mocks.rpc,
    from: mocks.from,
  },
}));
const ownProfile = {
  id: "offline-owner",
  username: "offline-owner",
  display_name: "Offline private profile",
  bio: "Private bio returned through the owner RPC",
  avatar_url: null,
  chat_city: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.secured.mockResolvedValue({ data: ownProfile, error: null });
  mocks.rpc.mockImplementation((name: string) =>
    name === "my_profile_full"
      ? { maybeSingle: mocks.secured }
      : Promise.resolve({ data: [], error: null }),
  );
  mocks.from.mockImplementation((table: string) => {
    const result = { data: table === "profiles" ? ownProfile : null, error: null };
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: async () => result,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    };
    for (const method of [query.select, query.eq, query.order, query.limit])
      method.mockReturnValue(query);
    return query;
  });
});
afterEach(cleanup);
describe("Own profile private read (offline component, not JWT)", () => {
  it("renders private bio without selecting the protected table column", async () => {
    render(<Profile />);
    expect((await screen.findAllByText(ownProfile.bio)).length).toBeGreaterThan(0);
    expect(mocks.from).not.toHaveBeenCalledWith("profiles");
  });
  it.each(["PGRST202", "42883"])(
    "keeps legacy schema compatibility only for missing RPC %s",
    async (code) => {
      mocks.secured.mockResolvedValue({ data: null, error: { code, message: "RPC absent" } });
      render(<Profile />);
      expect((await screen.findAllByText(ownProfile.bio)).length).toBeGreaterThan(0);
      expect(mocks.from).toHaveBeenCalledWith("profiles");
    },
  );
  it.each(["42501", "PGRST301", "NETWORK"])("does not bypass an RPC failure %s", async (code) => {
    mocks.secured.mockResolvedValue({
      data: null,
      error: { code, message: "Private read denied" },
    });
    render(<Profile />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Private read denied");
    expect(mocks.from).not.toHaveBeenCalledWith("profiles");
    expect(screen.queryByText(ownProfile.bio)).not.toBeInTheDocument();
  });
});
