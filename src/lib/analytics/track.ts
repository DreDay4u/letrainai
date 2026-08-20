import { supabase } from "../supabase";
import type { PublicEventName, PublicEventPayload } from "./events";

/**
 * Server-side analytics event recorder.
 *
 * Writes to the `analytics_events` table (shape unchanged from legacy):
 *   event_name | session_id | page_url | cta_id | metadata
 * Best-effort: never throws — a tracking failure must never break a user
 * flow or an API response.
 *
 * This module is server-only (imports the service-role Supabase client).
 * Client-side tracking goes through POST /api/events instead.
 */

export async function trackEvent(
  eventName: string,
  sessionId: string | null,
  pageUrl: string | null,
  ctaId: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.from("analytics_events").insert({
      event_name: eventName,
      session_id: sessionId,
      page_url: pageUrl,
      cta_id: ctaId,
      metadata: metadata ?? null,
    });
    if (error) {
      console.error(`[analytics] Failed to track event "${eventName}":`, error);
    }
  } catch (err) {
    console.error(`[analytics] Failed to track event "${eventName}":`, err);
  }
}

/**
 * Record a PUBLIC event (from the strict catalogue) server-side.
 * Same never-throws contract as trackEvent.
 */
export async function trackPublicEvent(payload: PublicEventPayload): Promise<void> {
  try {
    const { error } = await supabase.from("analytics_events").insert({
      event_name: payload.event_name,
      session_id: payload.session_id ?? null,
      page_url: payload.page ?? null,
      cta_id: payload.cta_id ?? null,
      metadata: {
        ...(payload.source ? { source: payload.source } : {}),
        ...(payload.utm_source ? { utm_source: payload.utm_source } : {}),
        ...(payload.utm_medium ? { utm_medium: payload.utm_medium } : {}),
        ...(payload.utm_campaign ? { utm_campaign: payload.utm_campaign } : {}),
        ...(payload.utm_content ? { utm_content: payload.utm_content } : {}),
        ...(payload.utm_term ? { utm_term: payload.utm_term } : {}),
      },
    });
    if (error) {
      console.error(
        `[analytics] Failed to track event "${payload.event_name}":`,
        error
      );
    }
  } catch (err) {
    fireAndForgetLog(payload.event_name, err);
  }
}

function fireAndForgetLog(eventName: PublicEventName, err: unknown): void {
  console.error(`[analytics] Failed to track event "${eventName}":`, err);
}
