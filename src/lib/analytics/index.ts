/**
 * Analytics package (Phase 5+6 normalization).
 *
 * - track.ts   — server-side recorder (service-role Supabase write)
 * - events.ts  — strict event-name catalogue + wire schema
 * - client.ts  — browser helper (POST /api/events, sendBeacon)
 *
 * `@/lib/analytics` keeps exporting trackEvent for existing importers
 * (assessment API routes, contact action) — import path unchanged.
 */
export { trackEvent, trackPublicEvent } from "./track";
export {
  PUBLIC_EVENT_NAMES,
  publicEventSchema,
  type PublicEventName,
  type PublicEventPayload,
} from "./events";
