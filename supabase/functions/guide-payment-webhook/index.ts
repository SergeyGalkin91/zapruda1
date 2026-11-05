import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * FAIL-CLOSED payment webhook stub for guide bookings.
 *
 * Shared header secret is NOT proof of YooKassa (or any provider) settlement.
 * Until provider HMAC + amount/currency/booking match is implemented,
 * this function NEVER marks paid (returns 501).
 *
 * Secrets:
 *   GUIDE_PAYMENT_WEBHOOK_SECRET — gate only (not settlement proof)
 * Future: YOOKASSA_SECRET / provider signature verification
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-zapruda-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: cors });

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Only explicit settled statuses. waiting_for_capture is NOT paid. */
const SETTLED_STATUSES = new Set(["paid", "succeeded", "success", "payment.succeeded"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed" });

  const expected = Deno.env.get("GUIDE_PAYMENT_WEBHOOK_SECRET") ?? "";
  if (!expected || expected.length < 16) {
    return respond(503, { error: "Webhook secret not configured" });
  }

  const provided = req.headers.get("x-zapruda-webhook-secret") ?? "";
  if (!timingSafeEqual(provided, expected)) {
    return respond(401, { error: "Invalid webhook signature" });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  const requestId = String(body.request_id ?? body.inquiry_id ?? body.inquiryId ?? "").trim();
  const providerPaymentId = String(
    body.provider_payment_id ?? body.payment_id ?? body.id ?? "",
  ).trim();
  const eventStatus = String(body.status ?? body.event ?? "")
    .toLowerCase()
    .trim();

  if (!eventStatus) {
    return respond(400, { error: "status required", paid: false });
  }
  if (!SETTLED_STATUSES.has(eventStatus)) {
    return respond(200, {
      ignored: true,
      reason: "non_settled_event",
      status: eventStatus,
      paid: false,
    });
  }
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    return respond(400, { error: "request_id required (uuid)", paid: false });
  }
  if (providerPaymentId.length < 4) {
    return respond(400, { error: "provider_payment_id required", paid: false });
  }

  // Until a provider-specific verified settlement implementation exists, no event
  // may update payment state, regardless of configured environment variables.
  return respond(501, {
    error: "Provider settlement verification not implemented; payment remains locked.",
    paid: false,
    request_id: requestId,
  });
});
