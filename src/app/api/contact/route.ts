import type { NextRequest } from "next/server";
import { z } from "zod";

/**
 * POST /api/contact
 *
 * Receives the multi-step contact form submission from /contact.
 * Validates the payload with Zod, rate-limits by client IP, and logs the
 * lead to the server console.
 *
 * Phase 3b: Wire Supabase persistence here (insert the validated lead into
 * the leads table). Until then, leads only go to the console.
 */

// In-memory rate limiter requires the Node.js runtime (not Edge).
export const runtime = "nodejs";

const RATE_LIMIT_MAX = 5; // submissions allowed per IP per window
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-memory rate limiter: client IP -> timestamps of accepted submissions.
// Resets on server restart; adequate for a single-instance deployment.
const submissionLog = new Map<string, number[]>();

// The contact page currently posts camelCase keys; the canonical schema below
// uses snake_case. Normalize incoming keys so both payload shapes validate.
const KEY_ALIASES: Record<string, string> = {
  service: "service_interest",
  companySize: "company_size",
  preferredTime: "preferred_time",
};

const contactSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Please enter a valid email address."),
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

function normalizeKeys(body: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    normalized[KEY_ALIASES[key] ?? key] = value;
  }
  return normalized;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string): boolean {
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

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 submissions per IP per hour.
    if (isRateLimited(getClientIp(request))) {
      return Response.json(
        { success: false, message: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return Response.json(
        { success: false, message: "Request body must be a JSON object." },
        { status: 400 }
      );
    }

    const parsed = contactSchema.safeParse(normalizeKeys(body as Record<string, unknown>));
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid submission.";
      return Response.json({ success: false, message }, { status: 400 });
    }

    const lead = parsed.data;

    // Phase 3b: Wire Supabase persistence here — insert `lead` into the leads table.
    console.log("[contact] New lead:", JSON.stringify(lead, null, 2));

    return Response.json({
      success: true,
      message: "We received your message. We'll get back to you within 24 hours.",
    });
  } catch (error) {
    console.error("[contact] Unexpected error:", error);
    return Response.json(
      { success: false, message: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
