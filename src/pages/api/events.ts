import type { APIRoute } from "astro";
import { publicEventSchema } from "@/lib/analytics/events";
import { trackPublicEvent } from "@/lib/analytics/track";

/**
 * Public analytics ingest — POST /api/events (Phase 6).
 *
 * Accepts ONLY the strict event catalogue (unknown names -> 400) and a
 * whitelisted set of non-PII fields (page, cta_id, session_id, source,
 * utm_*). Zod .strict() rejects any other key, so PII or raw assessment
 * answers can never reach the analytics_events table from the browser.
 * The insert uses the service-role client server-side — the browser
 * never talks to Supabase.
 *
 * Body-size limited; responds 204 so sendBeacon/fire-and-forget fetches
 * stay cheap. Recording is best-effort: a Supabase failure logs but the
 * endpoint still returns 204 (the event is not worth an error bubble).
 */

const MAX_BODY_BYTES = 4 * 1024; // 4KB — event payloads are tiny

function empty(status: number): Response {
  return new Response(null, { status });
}

export const POST: APIRoute = async ({ request }) => {
  // Body-size limit: reject oversized payloads before parsing.
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return empty(413);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return empty(413);
    }
    body = raw.length === 0 ? {} : JSON.parse(raw);
  } catch {
    return empty(400);
  }

  const parsed = publicEventSchema.safeParse(body);
  if (!parsed.success) {
    // Unknown event name OR smuggled extra fields (PII guard).
    return empty(400);
  }

  // Fire-and-forget: don't hold the response on the insert.
  void trackPublicEvent(parsed.data);

  return empty(204);
};

export const GET: APIRoute = () => empty(405);
