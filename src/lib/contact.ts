import { z } from "zod";

import { supabase, isSupabaseConfigured } from "./supabase";
import { trackEvent } from "./analytics";

/**
 * Contact lead logic — ported from
 * legacy-next/src/app/api/contact/route.ts (Phase 5).
 *
 * Transport-swap only: legacy semantics preserved exactly. This module is
 * framework-free (no astro:actions import) so it can be unit-tested with
 * plain esbuild bundles; src/actions/index.ts is a thin wrapper.
 *
 * Turnstile: DEFERRED (locked decision — limiter labeled TRANSITIONAL).
 */

const RATE_LIMIT_MAX = 5; // submissions allowed per IP per window
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/* TRANSITIONAL: in-memory rate limiter (client IP -> accepted timestamps).
 * Resets on server restart; adequate for a single-instance deployment.
 * Same pattern as src/lib/assessment/generate.ts. Replace with a shared
 * store (e.g. Valkey) when we go multi-instance. */
const submissionLog = new Map<string, number[]>();

// The contact island posts camelCase keys; canonical schema is snake_case.
// Normalize incoming keys so both payload shapes validate (legacy parity).
const KEY_ALIASES: Record<string, string> = {
  service: "service_interest",
  companySize: "company_size",
  preferredTime: "preferred_time",
};

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.email("Please enter a valid email address."),
  service_interest: z.string().optional(),
  industry: z.string().optional(),
  company_size: z.string().optional(),
  phone: z.string().optional(),
  preferred_time: z.string().optional(),
  message: z
    .string()
    .max(2000, "Message must be 2000 characters or fewer.")
    .optional(),
});

export type ContactLead = z.infer<typeof contactSchema>;

export function normalizeContactKeys(
  body: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    normalized[KEY_ALIASES[key] ?? key] = value;
  }
  return normalized;
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (submissionLog.get(ip) ?? []).filter((ts) => ts > cutoff);

  if (recent.length >= RATE_LIMIT_MAX) {
    submissionLog.set(ip, recent);
    return true;
  }

  recent.push(now);
  submissionLog.set(ip, recent);
  return false;
}

/** Test hook: clear the TRANSITIONAL limiter between unit tests. */
export function __resetContactRateLimit(): void {
  submissionLog.clear();
}

export type ContactValidation =
  | { ok: true; lead: ContactLead }
  | { ok: false; message: string };

/** Validate a raw (possibly camelCase) payload — legacy normalization +
 *  Zod schema, returning the first error message on failure. */
export function validateContactPayload(raw: unknown): ContactValidation {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }
  const parsed = contactSchema.safeParse(
    normalizeContactKeys(raw as Record<string, unknown>)
  );
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid submission.",
    };
  }
  return { ok: true, lead: parsed.data };
}

export interface ContactPersistResult {
  /** Row id when the insert succeeded; null when skipped or failed. */
  insertedId: string | null;
}

/**
 * Persist the lead to Supabase (best-effort — a DB failure must never
 * lose the user's submission; the response stays successful, exactly as
 * legacy behaved). Fires lead_created analytics on a successful insert.
 */
export async function persistContactLead(
  lead: ContactLead
): Promise<ContactPersistResult> {
  if (!isSupabaseConfigured) {
    console.warn(
      "[contact] Supabase not configured — skipping persistence (TRANSITIONAL)"
    );
    return { insertedId: null };
  }
  try {
    const { data: inserted, error } = await supabase
      .from("contact_leads")
      .insert({
        name: lead.name,
        email: lead.email,
        phone: lead.phone ?? null,
        industry: lead.industry ?? null,
        company_size: lead.company_size ?? null,
        service_interest: lead.service_interest ?? null,
        message: lead.message ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[contact] Failed to persist lead to Supabase:", error);
      return { insertedId: null };
    }
    // Downstream signal: a real lead row now exists.
    void trackEvent("lead_created", null, null, null);
    console.log("[contact] Lead persisted, id:", inserted.id);
    return { insertedId: inserted.id };
  } catch (err) {
    console.error("[contact] Supabase persistence error:", err);
    return { insertedId: null };
  }
}

export const CONTACT_SUCCESS_MESSAGE =
  "We received your message. We'll get back to you within 24 hours.";
export const CONTACT_RATE_LIMIT_MESSAGE =
  "Too many submissions. Please try again later.";
