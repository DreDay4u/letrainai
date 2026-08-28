import type { APIRoute } from "astro";
import { assessmentStartRequestSchema } from "@/lib/assessment/schema";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Assessment email capture at START — POST /api/assessment/start
 *
 * Growth Plan A (stage 1): capture the email on the FIRST question, not
 * after the report. Best-effort upsert of a 'started' row; the completion
 * path in /api/assessment updates the same row (unique session_id).
 * Failures here must never block the wizard — response stays success-shaped.
 */

const MAX_BODY_BYTES = 4 * 1024;

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: "Request body too large" }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = assessmentStartRequestSchema.safeParse(body);
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

  const { session_id: sessionId, email } = parsed.data;

  if (!isSupabaseConfigured) {
    console.warn(
      "[assessment/start] Supabase not configured — skipping capture (TRANSITIONAL)"
    );
    return json({ success: true }, 200);
  }

  try {
    const { error } = await supabase.from("assessment_results").upsert(
      {
        session_id: sessionId,
        email,
        status: "started",
      },
      { onConflict: "session_id" }
    );
    if (error) {
      console.error("[assessment/start] Supabase upsert failed:", error);
      // Capture is best-effort: report but don't fail the wizard.
      return json({ success: false }, 200);
    }
  } catch (err) {
    console.error("[assessment/start] Supabase error:", err);
    return json({ success: false }, 200);
  }

  return json({ success: true }, 200);
};

export const GET: APIRoute = () => json({ error: "Method not allowed" }, 405);
