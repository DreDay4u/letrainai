import { z } from "zod";

/**
 * Public analytics event catalogue + strict wire schema.
 *
 * Shared between the server endpoint (src/pages/api/events.ts) and — as a
 * type-only import — the client helper (src/lib/analytics/client.ts).
 * Imported from "zod" (not "astro/zod") so plain esbuild test bundles can
 * resolve it.
 */

/* ------------------------------------------------------------------ */
/* Event name catalogue (STRICT — unknown names are rejected)          */
/* ------------------------------------------------------------------ */

export const PUBLIC_EVENT_NAMES = [
  "landing_view",
  "cta_click",
  "assessment_start",
  "assessment_submit",
  "assessment_generated",
  "assessment_failed",
  "email_capture_submit",
  "contact_start",
  "contact_submit",
  "lead_created",
] as const;

export type PublicEventName = (typeof PUBLIC_EVENT_NAMES)[number];

/* ------------------------------------------------------------------ */
/* Wire schema for POST /api/events                                    */
/* ------------------------------------------------------------------ */

/**
 * STRICT schema: unknown event names AND unknown payload fields are both
 * rejected. Only non-PII attribution fields are allowed — no email, name,
 * phone, free-text, or raw assessment answers can ever enter analytics.
 */
export const publicEventSchema = z
  .object({
    event_name: z.enum(PUBLIC_EVENT_NAMES),
    session_id: z.string().max(64).optional(),
    page: z.string().max(512).optional(),
    cta_id: z.string().max(128).optional(),
    source: z.string().max(128).optional(),
    utm_source: z.string().max(128).optional(),
    utm_medium: z.string().max(128).optional(),
    utm_campaign: z.string().max(128).optional(),
    utm_content: z.string().max(128).optional(),
    utm_term: z.string().max(128).optional(),
  })
  .strict();

export type PublicEventPayload = z.infer<typeof publicEventSchema>;
