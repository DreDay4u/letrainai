import type { APIRoute } from "astro";
import { verifyWebhookEvent, markAssessmentPaid } from "@/lib/payments";
import { tierSchema } from "@/lib/assessment/schema";

/**
 * Stripe webhook — POST /api/stripe/webhook
 *
 * Signature-verified receiver for checkout.session.completed. This is the
 * durable record of payment (the success-redirect marks paid too, but a
 * buyer closing the tab before redirect must still get their report).
 * Handler is idempotent — markAssessmentPaid only writes unpaid rows.
 */

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = verifyWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err);
    return new Response("Bad signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = event.data.object;
  if (session.payment_status !== "paid") {
    return new Response(JSON.stringify({ received: true, ignored: "unpaid" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessionId =
    typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null;
  const tier = tierSchema.safeParse(session.metadata?.tier);
  if (!sessionId || !tier.success) {
    console.error("[stripe/webhook] completed session without reference/metadata");
    return new Response(JSON.stringify({ received: true, skipped: "no-metadata" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const marked = await markAssessmentPaid({
    sessionId,
    tier: tier.data,
    checkoutSessionId: session.id,
  });
  if (!marked) {
    // 500 so Stripe retries the delivery.
    return new Response("DB write failed", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true, marked: sessionId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
