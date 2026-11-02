import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.0";

/**
 * Payment provider webhook stub for guide bookings.
 * - Verifies shared secret / signature BEFORE any DB write.
 * - Calls mark_guide_booking_paid_from_provider via service_role only.
 * - Never trusts client-supplied "paid" flags.
 *
 * Secrets:
 *   GUIDE_PAYMENT_WEBHOOK_SECRET — required shared secret (header X-Zapruda-Webhook-Secret)
 *   Optional future: provider-specific HMAC (YOOKASSA_SECRET etc.) — not faked as success.
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return respond(503, { error: "Backend not configured" });

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  const inquiryId = String(body.inquiry_id ?? body.inquiryId ?? "").trim();
  const providerPaymentId = String(
    body.provider_payment_id ?? body.payment_id ?? body.id ?? "",
  ).trim();
  const eventStatus = String(body.status ?? body.event ?? "").toLowerCase();

  if (!/^[0-9a-f-]{36}$/i.test(inquiryId)) {
    return respond(400, { error: "inquiry_id required (uuid)" });
  }
  if (providerPaymentId.length < 4) {
    return respond(400, { error: "provider_payment_id required" });
  }

  // Only confirmed paid events; never mark paid on pending/canceled without explicit mapping
  const paidEvents = new Set(["paid", "succeeded", "success", "payment.succeeded", "waiting_for_capture"]);
  if (eventStatus && !paidEvents.has(eventStatus)) {
    return respond(200, { ignored: true, reason: "non_paid_event", status: eventStatus });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.rpc("mark_guide_booking_paid_from_provider", {
    p_inquiry_id: inquiryId,
    p_provider_payment_id: providerPaymentId,
  });

  if (error) {
    return respond(500, { error: error.message || "RPC failed" });
  }

  return respond(200, { ok: true, inquiry_id: inquiryId });
});
