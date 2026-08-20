import { supabase } from "./supabase";

/**
 * Best-effort analytics event tracking.
 *
 * Inserts a row into `analytics_events` and never throws: any failure is
 * logged and swallowed so the caller's user flow is never affected.
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
