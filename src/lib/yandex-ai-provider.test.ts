import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FALLBACK,
  DEFAULT_PRIMARY,
  canRetryWithFallback,
  generateYandexAdvice,
  modelUri,
  YandexProviderError,
} from "../../supabase/functions/zapruda-daily-advice/yandex-provider";

const config = {
  key: "test-only-not-a-real-key",
  folderId: "b1gexample123",
  primaryModel: DEFAULT_PRIMARY,
  fallbackModel: DEFAULT_FALLBACK,
  webSearchEnabled: false,
};
const input = {
  systemPrompt: "Ты рыболовный консультант.",
  userPrompt: "Мой секретный GPS 56.123456, 44.123456; приватная заметка.",
  target: "Судак",
  timeOfDay: "Утро",
};
const good = () => new Response(JSON.stringify({
  choices: [{ message: { content: "План без выдуманных сведений: выбирай подходящую приманку, проверяй погодные условия и правила." } }],
}), { status: 200 });

describe("Yandex AI provider contract", () => {
  it("uses the documented model URI and rejects malformed folder/model", () => {
    expect(modelUri(config.folderId, DEFAULT_PRIMARY)).toBe("gpt://b1gexample123/deepseek-v4.1-flash");
    expect(() => modelUri("BAD/ID", DEFAULT_PRIMARY)).toThrow("YANDEX_FOLDER_CONFIGURATION");
    expect(() => modelUri(config.folderId, "model/escape")).toThrow("YANDEX_MODEL_CONFIGURATION");
  });

  it("sends DeepSeek request to fixed Yandex host using server-only Api-Key", async () => {
    const request = vi.fn(async (_url: string, _options: RequestInit) => good());
    const result = await generateYandexAdvice(config, input, request as typeof fetch);
    expect(result.source).toBe("yandex-deepseek");
    expect(result.webSearch).toBe("disabled");
    expect(result.model).toBe(DEFAULT_PRIMARY);
    expect(result.sources).toEqual([]);
    expect(request).toHaveBeenCalledTimes(1);
    const [url, options] = request.mock.calls[0];
    expect(url).toBe("https://ai.api.cloud.yandex.net/v1/chat/completions");
    expect((options.headers as Record<string, string>)["Authorization"]).toBe("Api-Key test-only-not-a-real-key");
    const body = JSON.parse(String(options.body));
    expect(body.model).toBe("gpt://b1gexample123/deepseek-v4.1-flash");
  });

  it("never passes private location, notes, photos, JWT or coordinates into Web Search", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const request = vi.fn(async (url: string, options: RequestInit) => {
      calls.push({ url, body: String(options.body) });
      if (url.endsWith("/responses")) {
        return new Response(JSON.stringify({
          output: [{ content: [{ type: "output_text", text: "Сведения из публичного источника", annotations: [
            { type: "url_citation", url: "https://example.org/fishing", title: "Общие правила" },
          ] }] }],
        }), { status: 200 });
      }
      return good();
    });
    const result = await generateYandexAdvice({ ...config, webSearchEnabled: true }, input, request as typeof fetch);
    expect(result.webSearch).toBe("used");
    expect(result.sources).toEqual([{ title: "Общие правила", url: "https://example.org/fishing" }]);
    const searchCall = calls.find(x => x.url.endsWith("/responses"));
    expect(searchCall).toBeTruthy();
    expect(searchCall!.body).not.toContain("56.123456");
    expect(searchCall!.body).not.toContain("44.123456");
    expect(searchCall!.body).not.toContain("Мой секретный");
    expect(searchCall!.body).toContain('"type":"web_search"');
    expect(calls.find(x => x.url.endsWith("/chat/completions"))!.body).toContain("Мой секретный");
  });

  it("does not break advice when web search fails", async () => {
    const request = vi.fn(async (url: string) =>
      url.endsWith("/responses") ? new Response("", { status: 503 }) : good());
    const result = await generateYandexAdvice({ ...config, webSearchEnabled: true }, input, request as typeof fetch);
    expect(result.webSearch).toBe("unavailable");
    expect(result.sources).toHaveLength(0);
    expect(result.source).toBe("yandex-deepseek");
  });

  it("falls back to Alice AI Flash only for transient DeepSeek failures", async () => {
    const request = vi.fn(async (_url: string, options: RequestInit) =>
      JSON.parse(String(options.body)).model.includes(DEFAULT_PRIMARY)
        ? new Response("", { status: 503 })
        : good());
    const result = await generateYandexAdvice(config, input, request as typeof fetch);
    expect(result.source).toBe("yandex-fallback");
    expect(result.model).toBe(DEFAULT_FALLBACK);
    expect(request).toHaveBeenCalledTimes(2);
    expect(canRetryWithFallback(new YandexProviderError("YANDEX_UPSTREAM_UNAVAILABLE", 503))).toBe(true);
  });

  it("does not mask invalid credentials with fallback or fabricate an answer", async () => {
    const request = vi.fn(async () => new Response("", { status: 401 }));
    await expect(generateYandexAdvice(config, input, request as typeof fetch))
      .rejects.toMatchObject({ code: "YANDEX_INVALID_KEY" });
    expect(request).toHaveBeenCalledTimes(1);
    expect(canRetryWithFallback(new YandexProviderError("YANDEX_INVALID_KEY", 401))).toBe(false);
  });

  it("rejects empty provider completion", async () => {
    const request = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), { status: 200 }));
    await expect(generateYandexAdvice(config, input, request as typeof fetch))
      .rejects.toMatchObject({ code: "YANDEX_EMPTY_ANSWER" });
  });
});
