import type { AdviceInput } from "./fishing-plan";
export type GrokResult =
  | { ok: true; answer: string; alreadyUsed: boolean }
  | { ok: false; reason: "unavailable" | "timeout" | "cancelled" | "signin" };
type Invoke = (
  input: AdviceInput,
  signal: AbortSignal,
) => PromiseLike<{ data: unknown; error: unknown }>;

/** Optional enrichment always settles; it never manufactures a successful AI answer. */
export async function requestOptionalGrok(
  input: AdviceInput,
  invoke: Invoke,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<GrokResult> {
  if (options.signal?.aborted) return { ok: false, reason: "cancelled" };
  const controller = new AbortController();
  let timedOut = false;
  let onInternalAbort: () => void = () => {};
  const abort = new Promise<GrokResult>((resolve) => {
    onInternalAbort = () => resolve({ ok: false, reason: timedOut ? "timeout" : "cancelled" });
    controller.signal.addEventListener("abort", onInternalAbort, { once: true });
  });
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 45_000);
  try {
    const result = Promise.resolve().then(async (): Promise<GrokResult> => {
      if (controller.signal.aborted) return { ok: false, reason: "cancelled" };
      try {
        const { data, error } = await invoke(input, controller.signal);
        if (error) {
          const context = typeof error === "object" && "context" in error ? error.context : null;
          if (context instanceof Response && [401, 403].includes(context.status))
            return { ok: false, reason: "signin" };
          return { ok: false, reason: "unavailable" };
        }
        if (
          !data ||
          typeof data !== "object" ||
          !("answer" in data) ||
          typeof data.answer !== "string" ||
          data.answer.trim().length < 40 ||
          "error" in data
        )
          return { ok: false, reason: "unavailable" };
        return {
          ok: true,
          answer: data.answer,
          alreadyUsed: "already_used" in data && data.already_used === true,
        };
      } catch {
        return { ok: false, reason: "unavailable" };
      }
    });
    return await Promise.race([result, abort]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onExternalAbort);
    controller.signal.removeEventListener("abort", onInternalAbort);
  }
}
