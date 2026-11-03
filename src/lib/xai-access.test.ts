import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkXaiAccess,
  normalizeXaiBase,
  normalizeXaiKey,
} from "../../supabase/functions/zapruda-daily-advice/xai-access";

const config = { key: "offline-key-fixture", base: "https://api.x.ai/v1", model: "grok-3-mini" };
const fetcher = vi.fn<typeof fetch>();
const classify = vi.fn(async () => "XAI_INVALID_API_KEY");
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const account = {
  api_key_blocked: false,
  api_key_disabled: false,
  team_blocked: false,
  acls: ["api-key:endpoint:chat", "api-key:model:grok-3-mini"],
  team_id: "PRIVATE_TEAM",
  redacted_api_key: "PRIVATE_KEY_FRAGMENT",
};
const models = { data: [{ id: "grok-3-mini", aliases: ["mini-alias"] }] };
beforeEach(() => {
  vi.clearAllMocks();
  fetcher.mockImplementation(async (url) =>
    json(String(url).endsWith("/api-key") ? account : models),
  );
  classify.mockResolvedValue("XAI_INVALID_API_KEY");
});
describe("xAI access diagnostics (disconnected provider fixtures, not live generation)", () => {
  it.each([
    "offline-key-fixture",
    " offline-key-fixture\n",
    '"offline-key-fixture"',
    "'offline-key-fixture'",
    "Bearer offline-key-fixture",
    'Bearer "offline-key-fixture"',
    'XAI_API_KEY="offline-key-fixture"',
    "export XAI_API_KEY='offline-key-fixture'",
  ])("repairs a common copy wrapper without replacing the credential: %s", (value) => {
    expect(normalizeXaiKey(value)).toBe(config.key);
  });
  it.each(["https://api.x.ai", "https://api.x.ai/v1/", "https://api.x.ai/v1/chat/completions"])(
    "normalizes the official endpoint %s",
    (value) => expect(normalizeXaiBase(value)).toBe(config.base),
  );
  it.each([
    "http://api.x.ai/v1",
    "https://attacker.invalid/v1",
    "https://api.x.ai/v1?token=PRIVATE",
    "https://api.x.ai/unknown",
  ])("rejects an unintended credential destination %s", (value) =>
    expect(normalizeXaiBase(value)).toBeNull(),
  );
  it("reports bounded states without provider identity, ACL text or a key fragment", async () => {
    const result = await checkXaiAccess(config, classify, fetcher);
    expect(result).toMatchObject({
      canGenerate: true,
      code: "XAI_READY_FOR_GENERATION",
      chat: "allowed",
      model: "allowed",
      credits: "unverified",
    });
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|offline-key|api-key:/);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      config.base + "/api-key",
      config.base + "/models",
    ]);
    expect(fetcher.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(
      true,
    );
  });
  it.each([
    ["api_key_disabled", "XAI_KEY_DISABLED"],
    ["api_key_blocked", "XAI_KEY_BLOCKED"],
    ["team_blocked", "XAI_TEAM_BLOCKED"],
  ])("identifies %s without a generation call", async (flag, code) => {
    fetcher.mockResolvedValue(json({ ...account, [flag]: true }));
    expect(await checkXaiAccess(config, classify, fetcher)).toMatchObject({
      canGenerate: false,
      code,
      stage: "account",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("distinguishes missing chat permission from an invalid key", async () => {
    fetcher.mockResolvedValue(json({ ...account, acls: ["api-key:model:*"] }));
    expect(await checkXaiAccess(config, classify, fetcher)).toMatchObject({
      canGenerate: false,
      code: "XAI_ENDPOINT_DENIED",
    });
  });
  it("distinguishes model ACL denial from catalog absence", async () => {
    fetcher.mockImplementation(async (url) =>
      json(
        String(url).endsWith("/api-key")
          ? { ...account, acls: ["api-key:endpoint:chat", "api-key:model:another-model"] }
          : models,
      ),
    );
    expect(await checkXaiAccess(config, classify, fetcher)).toMatchObject({
      canGenerate: false,
      code: "XAI_MODEL_DENIED",
    });
    fetcher.mockImplementation(async (url) =>
      json(String(url).endsWith("/api-key") ? account : { data: [] }),
    );
    expect(await checkXaiAccess(config, classify, fetcher)).toMatchObject({
      canGenerate: false,
      code: "XAI_MODEL_UNAVAILABLE",
    });
  });
  it("matches canonical model ACLs when the configured model is an alias", async () => {
    expect(
      await checkXaiAccess({ ...config, model: "mini-alias" }, classify, fetcher),
    ).toMatchObject({ canGenerate: true, model: "allowed" });
  });
  it("does not demand metadata-listing privileges from a scoped chat key", async () => {
    fetcher.mockImplementation(async () => json({}, 403));
    classify.mockResolvedValue("XAI_ACCESS_DENIED");
    expect(await checkXaiAccess(config, classify, fetcher)).toMatchObject({
      canGenerate: true,
      code: "XAI_ACCESS_UNVERIFIED",
      chat: "unknown",
      model: "unknown",
    });
  });
  it("stops on an explicit invalid credential without another provider call", async () => {
    fetcher.mockImplementation(async () => json({}, 401));
    expect(await checkXaiAccess(config, classify, fetcher)).toMatchObject({
      canGenerate: false,
      code: "XAI_INVALID_API_KEY",
      accountHttp: 401,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(["bad key", "bad\nkey", "bad\u0000key"])(
    "rejects malformed headers locally: %s",
    async (key) => {
      expect(await checkXaiAccess({ ...config, key }, classify, fetcher)).toMatchObject({
        canGenerate: false,
        code: "XAI_KEY_FORMAT",
      });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("bounds model metadata and returns no arbitrary provider content", async () => {
    fetcher.mockImplementation(async (url) =>
      String(url).endsWith("/api-key")
        ? json(account)
        : json({ data: [], private: "PRIVATE".repeat(50_000) }),
    );
    const result = await checkXaiAccess(config, classify, fetcher);
    expect(result).toMatchObject({ canGenerate: false, code: "XAI_PROVIDER_UNAVAILABLE" });
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });
});
