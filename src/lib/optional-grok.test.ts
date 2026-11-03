import { afterEach, describe, expect, it, vi } from "vitest";
import { requestOptionalGrok } from "./optional-grok";
const input = { location: "Ока", target: "Окунь", time: "Утро", notes: "" };
const answer = "Offline synthetic AI response long enough for the successful-response contract.";
afterEach(() => vi.useRealTimers());

describe("Optional Grok request boundary", () => {
  it("accepts a real response contract and preserves cached status", async () => {
    const invoke = vi.fn(async () => ({ data: { answer, already_used: true }, error: null }));
    expect(await requestOptionalGrok(input, invoke)).toEqual({
      ok: true,
      answer,
      alreadyUsed: true,
    });
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it.each([null, {}, { answer: "short" }, { answer, error: "PRIVATE_PROVIDER_DIAGNOSTIC" }])(
    "does not invent an AI answer for %j",
    async (data) => {
      expect(await requestOptionalGrok(input, async () => ({ data, error: null }))).toEqual({
        ok: false,
        reason: "unavailable",
      });
    },
  );
  it("contains invalid-key failures without exposing their body", async () => {
    const error = {
      context: new Response(
        JSON.stringify({ error: "PRIVATE_PROVIDER_DIAGNOSTIC", code: "XAI_INVALID_API_KEY" }),
        { status: 502 },
      ),
    };
    expect(await requestOptionalGrok(input, async () => ({ data: null, error }))).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });
  it("contains thrown network failures", async () => {
    const result = await requestOptionalGrok(input, async () => {
      throw new Error("PRIVATE_NETWORK_DIAGNOSTIC");
    });
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });
  it("settles and aborts a request even when its transport never resolves", async () => {
    vi.useFakeTimers();
    let received: AbortSignal | undefined;
    const pending = requestOptionalGrok(
      input,
      (_input, signal) => {
        received = signal;
        return new Promise(() => {});
      },
      { timeoutMs: 100 },
    );
    await vi.advanceTimersByTimeAsync(101);
    expect(await pending).toEqual({ ok: false, reason: "timeout" });
    expect(received?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not send a request after cancellation and settles an active cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const invoke = vi.fn();
    expect(await requestOptionalGrok(input, invoke, { signal: controller.signal })).toEqual({
      ok: false,
      reason: "cancelled",
    });
    expect(invoke).not.toHaveBeenCalled();
    const active = new AbortController();
    const pending = requestOptionalGrok(input, () => new Promise(() => {}), {
      signal: active.signal,
    });
    active.abort();
    expect(await pending).toEqual({ ok: false, reason: "cancelled" });
  });
  it("identifies an expired sign-in without copying raw errors", async () => {
    expect(
      await requestOptionalGrok(input, async () => ({
        data: null,
        error: { context: new Response("private", { status: 401 }) },
      })),
    ).toEqual({ ok: false, reason: "signin" });
  });
});
