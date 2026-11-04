import { afterEach, describe, expect, it, vi } from "vitest";
import { validateClientConfiguration } from "./clientConfiguration";

const createClient = vi.hoisted(() => vi.fn(() => ({ auth: { getUser: vi.fn() } })));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("./previewAuthStorage", () => ({ brokeredPreviewStorage: () => undefined }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.resetModules();
});
const stage = {
  url: "https://yudtbifopfnjtjanaqrd.supabase.co",
  publishableKey: "public-test-key",
};

describe("explicit Supabase configuration", () => {
  it.each([
    {},
    { url: stage.url },
    { publishableKey: stage.publishableKey },
    { ...stage, url: "  " },
  ])("rejects incomplete configuration without a production fallback", (config) => {
    expect(() => validateClientConfiguration(config)).toThrow("configuration is missing");
  });
  it("accepts an explicit isolated project", () => {
    expect(validateClientConfiguration({ ...stage, hostname: "localhost" }).url).toBe(stage.url);
  });
  it.each(["localhost", "127.0.0.1", "[::1]", "demo.localhost", "branch--zapruda1.netlify.app"])(
    "rejects production on %s",
    (hostname) => {
      expect(() =>
        validateClientConfiguration({
          ...stage,
          url: "https://sonvniuwtvzzyuglscah.supabase.co",
          hostname,
        }),
      ).toThrow("isolated");
    },
  );
  it.each(["staging", "branch-deploy", "deploy-preview", "test"])(
    "rejects production in server context %s",
    (context) => {
      expect(() =>
        validateClientConfiguration({
          ...stage,
          url: "https://sonvniuwtvzzyuglscah.supabase.co",
          context,
        }),
      ).toThrow("isolated");
    },
  );
  it("permits explicitly configured production outside development", () => {
    expect(
      validateClientConfiguration({
        ...stage,
        url: "https://sonvniuwtvzzyuglscah.supabase.co",
        hostname: "example.org",
        context: "production",
      }).url,
    ).toContain("sonvniuwtvzzyuglscah");
  });
  it("rejects server-only keys without echoing them", () => {
    const keys = [
      "sb_secret_synthetic-test",
      `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`,
    ];
    for (const publishableKey of keys) {
      let message = "";
      try {
        validateClientConfiguration({ ...stage, publishableKey });
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain("server secret");
      expect(message.includes(publishableKey)).toBe(false);
    }
  });
  it("the real lazy client cannot initialize with an empty environment", async () => {
    for (const name of [
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_URL",
      "SUPABASE_PUBLISHABLE_KEY",
      "CONTEXT",
    ])
      vi.stubEnv(name, "");
    const { supabase } = await import("./client");
    expect(() => supabase.auth).toThrow("configuration is missing");
    expect(createClient).not.toHaveBeenCalled();
  });
  it("the real preview client stays on staging even with production inputs", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://sonvniuwtvzzyuglscah.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    vi.stubEnv("CONTEXT", "deploy-preview");
    const { supabase } = await import("./client");
    void supabase.auth;
    expect(createClient.mock.calls.length).toBe(1);
    expect((createClient.mock.calls[0] as unknown as string[])[0]).toBe(stage.url);
  });
});
