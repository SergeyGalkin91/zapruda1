import { describe, expect, it } from "vitest";
import { trustedSpotOrigin } from "../../supabase/functions/zapruda-spot-records/origin";
describe("SPOT browser origin boundary (JWT authorization is separate)", () => {
  it.each([
    null,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://deploy-preview-93--zapruda1.netlify.app",
    "https://6aebae0a59ab32e0cc56cdfb--zapruda1.netlify.app",
  ])("accepts the exact development/owned preview origin %s", (origin) =>
    expect(trustedSpotOrigin(origin)).toBe(true),
  );
  it.each([
    "null",
    "https://zapruda1.netlify.app",
    "https://6aebae0a59ab32e0cc56cdfb--other.netlify.app",
    "https://6aebae0a59ab32e0cc56cdfb--zapruda1.netlify.app.evil.test",
    "http://6aebae0a59ab32e0cc56cdfb--zapruda1.netlify.app",
    "https://deploy-preview-93--zapruda1.netlify.app/path",
    "https://6aebae0a59ab32e0cc56cdfb--zapruda1.netlify.app:444",
    "https://evil.test",
  ])("rejects unrelated or non-origin URL %s", (origin) =>
    expect(trustedSpotOrigin(origin)).toBe(false),
  );
});
