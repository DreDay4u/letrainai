import type { APIRoute } from "astro";
import { tierSchema } from "@/lib/assessment/schema";
import { checkRateLimit, getClientIp } from "@/lib/assessment/generate";
import { getStripe, priceIdForTier } from "@/lib/payments";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
/**
 * Create a Stripe Checkout Session — POST /api/checkout
 *
 * Accepts JSON { session_id, tier } from the wizard results view, or a plain
 * form POST (same fields) from the locked report page so an abandoned
 * checkout can be resumed without retaking the assessment.
 *
 * - tier "report"  → $149 Full AI Readiness Report
 * - tier "session" → $499 Report + 60-min strategy session
 *
 * On success: JSON { url } (wizard) or 303 redirect to the Stripe URL (form).
 */

const MAX_BODY_BYTES = 4 * 1024;

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.PUBLIC_SITE_URL ??
    "https://letrainai.com"
  ).replace(/\/$/, "");
}

export const POST: APIRoute = async ({ request }) => {
  const isForm =
    (request.headers.get("content-type") ?? "").includes(
      "application/x-www-form-urlencoded"
    );

  let sessionId = "";
  let tier = "";
  if (isForm) {
    const params = new URLSearchParams(await request.text());
    sessionId = (params.get("session_id") ?? "").trim();
    tier = (params.get("tier") ?? "").trim();
  } else {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return json({ error: "Request body too large" }, 413);
    }
    let body: unknown;
    try {
      body = JSON.parse(await request.text());
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const obj = (body ?? {}) as Record<string, unknown>;
    sessionId = typeof obj.session_id === "string" ? obj.session_id.trim() : "";
    tier = typeof obj.tier === "string" ? obj.tier.trim() : "";
  }

  const tierParsed = tierSchema.safeParse(tier);
  const sidParsed =
    typeof sessionId === "string" &&
    sessionId.length >= 8 &&
    sessionId.length <= 64;
  if (!tierParsed.success || !sidParsed) {
    return json({ error: "Invalid request" }, 400);
  }

  if (!checkRateLimit(`checkout:${getClientIp(request)}`)) {
    return json({ error: "Too many checkout attempts. Try again in an hour." }, 429);
  }

  const stripe = getStripe();
  const priceId = priceIdForTier(tierParsed.data);
  if (!stripe || !priceId) {
    console.error("[checkout] Stripe or price not configured");
    return json({ error: "Checkout is temporarily unavailable." }, 503);
  }

  if (!isSupabaseConfigured) {
    return json({ error: "Checkout is temporarily unavailable." }, 503);
  }

  // The assessment must exist and be completed — nothing to sell otherwise.
  const { data: row, error: rowError } = await supabase
    .from("assessment_results")
    .select("session_id, email, status, payment_status")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (rowError) {
    console.error("[checkout] Supabase lookup failed:", rowError);
    return json({ error: "Checkout is temporarily unavailable." }, 503);
  }
  if (!row || row.status !== "completed") {
    return json({ error: "Assessment not found — retake the assessment first." }, 404);
  }
  if (row.payment_status === "paid") {
    // Already paid: send them to their report instead of charging twice.
    const url = `${siteUrl()}/report/${sessionId}`;
    return isForm
      ? Response.redirect(url, 303)
      : json({ url, already_paid: true }, 200);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: sessionId,
      customer_email: row.email ?? undefined,
      metadata: { session_id: sessionId, tier: tierParsed.data },
      success_url: `${siteUrl()}/api/checkout/success?cs={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/report/${sessionId}?checkout=cancelled`,
    });
    if (!session.url) {
      throw new Error("Stripe returned a session without a URL");
    }
    return isForm
      ? Response.redirect(session.url, 303)
      : json({ url: session.url }, 200);
  } catch (err) {
    console.error("[checkout] Stripe session creation failed:", err);
    return json({ error: "Checkout is temporarily unavailable." }, 503);
  }
};

export const GET: APIRoute = () => json({ error: "Method not allowed" }, 405);
