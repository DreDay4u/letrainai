import type { APIRoute } from "astro";
import { emailRequestSchema } from "@/lib/assessment/schema";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

/**
 * Assessment email capture — POST /api/assessment/email
 *
 * Ported from legacy-next/src/app/api/assessment/email/route.ts (Phase 4).
 * Stores the email address of a user who completed the AI assessment
 * so their full report can be sent.
 */

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = emailRequestSchema.safeParse(body);
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

  // Persist the email onto the assessment result (best-effort). The service
  // role client bypasses RLS, so this update works even though the table
  // only has an INSERT policy for anon.
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("assessment_results")
        .update({ email })
        .eq("session_id", sessionId)
        .select("id");
      if (error) {
        console.error("[assessment] Failed to persist email to Supabase:", error);
      } else {
        console.log(
          `[assessment] email capture session=${sessionId} email=${email} rows_updated=${data?.length ?? 0}`
        );
      }
    } catch (err) {
      console.error("[assessment] Supabase persistence error:", err);
    }
  } else {
    console.warn(
      "[assessment] Supabase not configured — skipping email persistence (TRANSITIONAL)"
    );
  }

  // Best-effort analytics event.
  await trackEvent("email_submit", sessionId, null, null);

  return json({ success: true }, 200);
};

export const GET: APIRoute = () =>
  json({ error: "Method not allowed" }, 405);
