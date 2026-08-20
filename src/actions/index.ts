import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";

import {
  CONTACT_RATE_LIMIT_MESSAGE,
  CONTACT_SUCCESS_MESSAGE,
  isRateLimited,
  persistContactLead,
  validateContactPayload,
} from "@/lib/contact";
import { trackEvent } from "@/lib/analytics";

/**
 * Astro Actions — Phase 5.
 *
 * `contact` is a thin wrapper around src/lib/contact.ts (framework-free
 * logic, unit-testable). Legacy route semantics preserved: rate limit ->
 * validate -> best-effort persist -> best-effort analytics. The DB write
 * never breaks the user response; the user never sees a stack trace.
 *
 * Turnstile: DEFERRED (locked decision — limiter labeled TRANSITIONAL).
 */

export const server = {
  contact: defineAction({
    accept: "json",
    input: z.record(z.string(), z.unknown()),
    handler: async (rawInput, context) => {
      // Rate limit: 5 submissions per IP per hour (TRANSITIONAL in-memory).
      const ip =
        context.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        context.request.headers.get("x-real-ip") ??
        "unknown";
      if (isRateLimited(ip)) {
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message: CONTACT_RATE_LIMIT_MESSAGE,
        });
      }

      const validation = validateContactPayload(rawInput);
      if (!validation.ok) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: validation.message,
        });
      }

      // Best-effort persistence: never loses the submission.
      await persistContactLead(validation.lead);

      // Best-effort analytics (fire-and-forget).
      void trackEvent("contact_submit", null, null, null);

      return {
        success: true,
        message: CONTACT_SUCCESS_MESSAGE,
      };
    },
  }),
};
