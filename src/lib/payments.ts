import Stripe from "stripe";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { Tier } from "./assessment/schema";

/**
 * Payments — Stripe access + payment-state writes on assessment_results.
 *
 * Env (runtime, server-only):
 *   STRIPE_SECRET_KEY            sk_live_... / sk_test_...
 *   STRIPE_PRICE_REPORT          price id of the $149 Full Report tier
 *   STRIPE_PRICE_SESSION         price id of the $499 Report+Session tier
 *   STRIPE_WEBHOOK_SECRET        signing secret of /api/stripe/webhook
 */

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) {
    client = new Stripe(key, {
      telemetry: false,
      appInfo: { name: "LeTrainAI" },
    });
  }
  return client;
}

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

export function priceIdForTier(tier: Tier): string | null {
  if (tier === "report") return process.env.STRIPE_PRICE_REPORT ?? null;
  if (tier === "session") return process.env.STRIPE_PRICE_SESSION ?? null;
  return null;
}

/**
 * Mark an assessment row paid. Sets payment state only when unpaid, so the
 * Stripe success-redirect and the webhook can land in either order and the
 * write is idempotent (second writer matches zero rows).
 */
export async function markAssessmentPaid(input: {
  sessionId: string;
  tier: Tier;
  checkoutSessionId: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.error("[payments] Supabase not configured — cannot mark paid");
    return false;
  }
  const { error } = await supabase
    .from("assessment_results")
    .update({
      payment_status: "paid",
      paid_tier: input.tier,
      stripe_checkout_session_id: input.checkoutSessionId,
      paid_at: new Date().toISOString(),
    })
    .eq("session_id", input.sessionId)
    .eq("payment_status", "unpaid")
    .select("id");
  if (error) {
    console.error("[payments] markAssessmentPaid failed:", error);
    return false;
  }
  // 0 rows = already marked paid (idempotent re-delivery) — still a success.
  return true;
}

/**
 * Verify a webhook body against STRIPE_WEBHOOK_SECRET and return the typed
 * event. Throws on bad signature/stale timestamp — callers must 400.
 */
export function verifyWebhookEvent(
  rawBody: string,
  signatureHeader: string | null
): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    throw new Error("Stripe webhook is not configured");
  }
  if (!signatureHeader) {
    throw new Error("Missing stripe-signature header");
  }
  return stripe.webhooks.constructEvent(rawBody, signatureHeader, secret);
}
