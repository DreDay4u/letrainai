import type { APIRoute } from "astro";
import { getStripe, markAssessmentPaid } from "@/lib/payments";
import { tierSchema } from "@/lib/assessment/schema";

/**
 * Stripe success redirect — GET /api/checkout/success?cs={CHECKOUT_SESSION_ID}
 *
 * Stripe drops the payer here after payment. Webhooks can lag, so this route
 * verifies the session directly against Stripe, marks the assessment paid,
 * and only then redirects to the report — the buyer never sees a "locked"
 * page after paying.
 */

function baseUrl(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
  ).replace(/\/$/, "");
}

function failRedirect(request: Request, message: string): Response {
  const url = new URL("/assessment", baseUrl(request));
  url.searchParams.set("checkout", "error");
  url.searchParams.set("reason", message);
  return Response.redirect(url.toString(), 303);
}

export const GET: APIRoute = async ({ url, request }) => {
  const cs = url.searchParams.get("cs");
  if (!cs || !/^(cs_(test|live)_)?[A-Za-z0-9]{8,200}$/.test(cs)) {
    return failRedirect(request, "missing-session");
  }

  const stripe = getStripe();
  if (!stripe) {
    console.error("[checkout/success] Stripe not configured");
    return failRedirect(request, "not-configured");
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(cs);
    if (session.payment_status !== "paid") {
      // Unpaid/expired session — never unlocks anything.
      return failRedirect(request, "not-paid");
    }
    const sessionId = session.client_reference_id;
    const tier = tierSchema.safeParse(session.metadata?.tier);
    if (!sessionId || !tier.success) {
      console.error("[checkout/success] session missing reference/metadata");
      return failRedirect(request, "bad-metadata");
    }
    const marked = await markAssessmentPaid({
      sessionId,
      tier: tier.data,
      checkoutSessionId: session.id,
    });
    if (!marked) {
      return failRedirect(request, "db-write-failed");
    }
    return Response.redirect(
      `${baseUrl(request)}/report/${encodeURIComponent(sessionId)}`,
      303
    );
  } catch (err) {
    console.error("[checkout/success] verification failed:", err);
    return failRedirect(request, "verification-failed");
  }
};
