import type { APIRoute } from "astro";
import { assessmentRequestSchema } from "@/lib/assessment/schema";
import {
  cacheResult,
  checkRateLimit,
  generateResult,
  getCachedResult,
  getClientIp,
} from "@/lib/assessment/generate";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

/**
 * AI Assessment API — POST /api/assessment
 *
 * Ported from legacy-next/src/app/api/assessment/route.ts (Phase 4).
 * Accepts the 5-question assessment answers, calls DeepSeek for a
 * personalized AI-opportunity report, and returns a validated result.
 * Falls back to a deterministic result when DeepSeek is unavailable.
 */

const MAX_BODY_BYTES = 32 * 1024; // 32KB — payload is well under this; blocks abuse

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return json(
      { error: "You've reached the assessment limit. Try again in an hour." },
      429
    );
  }

  // Body-size limit: reject oversized payloads before parsing.
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: "Request body too large" }, 413);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json({ error: "Request body too large" }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = assessmentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        error: "Invalid request",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      400
    );
  }

  const { session_id: sessionId, answers } = parsed.data;

  // Idempotency: return the cached result for a repeated session_id.
  const cached = getCachedResult(sessionId);
  if (cached) return json(cached, 200);

  const result = await generateResult(answers);
  cacheResult(sessionId, result);

  // Best-effort persistence: save the result to Supabase. A DB failure
  // must never break the user's response.
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from("assessment_results").insert({
        session_id: sessionId,
        industry: answers.industry,
        company_size: answers.company_size,
        responses: answers,
        recommendation: result,
        status: "completed",
      });
      if (error) {
        console.error("[assessment] Failed to persist result to Supabase:", error);
      }
    } catch (err) {
      console.error("[assessment] Supabase persistence error:", err);
    }
  } else {
    console.warn(
      "[assessment] Supabase not configured — skipping persistence (TRANSITIONAL)"
    );
  }

  // Best-effort analytics event.
  await trackEvent("assessment_complete", sessionId, null, null);

  return json(result, 200);
};

export const GET: APIRoute = () =>
  json({ error: "Method not allowed" }, 405);
