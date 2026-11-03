type State = "allowed" | "denied" | "unknown";
export type XaiAccess = {
  canGenerate: boolean;
  code: string;
  stage: "configuration" | "account" | "models";
  accountHttp: number | null;
  modelsHttp: number | null;
  chat: State;
  model: State;
  credits: "unverified";
};
export function normalizeXaiKey(raw: string): string {
  let value = raw.trim();
  for (let pass = 0; pass < 2; pass++) {
    value = value.replace(/^(?:export\s+)?XAI_API_KEY\s*=\s*/i, "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1).trim();
    value = value.replace(/^Bearer\s+/i, "").trim();
  }
  return value;
}
export function normalizeXaiBase(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    if (
      parsed.protocol !== "https:" ||
      !["api.x.ai", "us.api.x.ai"].includes(parsed.hostname) ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      parsed.search ||
      parsed.hash ||
      !["", "/", "/v1", "/v1/", "/v1/chat/completions"].includes(parsed.pathname)
    )
      return null;
    return `${parsed.origin}/v1`;
  } catch {
    return null;
  }
}
async function boundedJson(response: Response, max: number): Promise<Record<string, unknown>> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty provider metadata");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) throw new Error("Provider metadata too large");
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const result: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!result || typeof result !== "object" || Array.isArray(result))
      throw new Error("Invalid provider metadata");
    return result as Record<string, unknown>;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Only fixed states leave this helper. Never return account/team IDs, ACLs or key text. */
export async function checkXaiAccess(
  config: { key: string; base: string; model: string },
  classify: (response: Response) => Promise<string>,
  fetcher: typeof fetch = fetch,
): Promise<XaiAccess> {
  const result: XaiAccess = {
    canGenerate: false,
    code: "XAI_PROVIDER_UNAVAILABLE",
    stage: "configuration",
    accountHttp: null,
    modelsHttp: null,
    chat: "unknown",
    model: "unknown",
    credits: "unverified",
  };
  if (
    !config.key ||
    config.key.length > 1024 ||
    [...config.key].some(
      (character) => character.charCodeAt(0) < 33 || character.charCodeAt(0) > 126,
    )
  )
    return { ...result, code: "XAI_KEY_FORMAT" };
  const base = normalizeXaiBase(config.base);
  if (!base) return { ...result, code: "XAI_ENDPOINT_CONFIGURATION" };
  let acls: string[] | null = null;
  result.stage = "account";
  try {
    const response = await fetcher(`${base}/api-key`, {
      headers: { Authorization: `Bearer ${config.key}` },
      signal: AbortSignal.timeout(8000),
    });
    result.accountHttp = response.status;
    if (response.ok) {
      const account = await boundedJson(response, 32 * 1024);
      if (account["api_key_blocked"] === true) return { ...result, code: "XAI_KEY_BLOCKED" };
      if (account["api_key_disabled"] === true) return { ...result, code: "XAI_KEY_DISABLED" };
      if (account["team_blocked"] === true) return { ...result, code: "XAI_TEAM_BLOCKED" };
      if (
        Array.isArray(account["acls"]) &&
        account["acls"].every((item) => typeof item === "string")
      ) {
        acls = account["acls"] as string[];
        result.chat =
          acls.includes("api-key:endpoint:*") || acls.includes("api-key:endpoint:chat")
            ? "allowed"
            : "denied";
        if (result.chat === "denied") return { ...result, code: "XAI_ENDPOINT_DENIED" };
      }
    } else {
      const code = await classify(response);
      if (code === "XAI_INVALID_API_KEY" || code === "XAI_INSUFFICIENT_CREDITS")
        return { ...result, code };
      // Introspection can be forbidden to an otherwise valid scoped chat key.
      if (response.status >= 500 || response.status === 429) return { ...result, code };
    }
  } catch {
    // Models/chat access can still work when the optional account endpoint fails.
  }
  result.stage = "models";
  try {
    const response = await fetcher(`${base}/models`, {
      headers: { Authorization: `Bearer ${config.key}` },
      signal: AbortSignal.timeout(8000),
    });
    result.modelsHttp = response.status;
    if (!response.ok) {
      const code = await classify(response);
      if (["XAI_INVALID_API_KEY", "XAI_INSUFFICIENT_CREDITS"].includes(code))
        return { ...result, code };
      if (response.status >= 500 || response.status === 429) return { ...result, code };
      // Do not demand list-models permission from a least-privilege chat key.
      return { ...result, canGenerate: true, code: "XAI_ACCESS_UNVERIFIED" };
    }
    const payload = await boundedJson(response, 256 * 1024);
    const models = payload["data"];
    if (!Array.isArray(models)) return result;
    const entry = models.find(
      (item) =>
        item &&
        typeof item === "object" &&
        (item.id === config.model ||
          (Array.isArray(item.aliases) && item.aliases.includes(config.model))),
    ) as { id?: unknown; aliases?: unknown } | undefined;
    if (!entry) return { ...result, code: "XAI_MODEL_UNAVAILABLE", model: "denied" };
    if (acls) {
      const names = [
        config.model,
        entry.id,
        ...(Array.isArray(entry.aliases) ? entry.aliases : []),
      ];
      if (
        !acls.includes("api-key:model:*") &&
        !names.some((name) => typeof name === "string" && acls!.includes(`api-key:model:${name}`))
      )
        return { ...result, code: "XAI_MODEL_DENIED", model: "denied" };
    }
    return { ...result, canGenerate: true, code: "XAI_READY_FOR_GENERATION", model: "allowed" };
  } catch {
    return result;
  }
}
