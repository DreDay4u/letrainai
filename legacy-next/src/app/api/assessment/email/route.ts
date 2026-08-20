import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

/**
 * Assessment email capture — POST /api/assessment/email
 *
 * Stores the email address of a user who completed the AI assessment
 * so their full report can be sent. Persistence (Supabase) is wired
 * separately — for now this validates and logs.
 */

const emailRequestSchema = z.object({
  session_id: z.string().min(1).max(64),
  email: z.string().email().max(254),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = emailRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid request",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const { session_id: sessionId, email } = parsed.data;

  // Persist the email onto the assessment result (best-effort). The service
  // role client bypasses RLS, so this update works even though the table
  // only has an INSERT policy for anon.
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

  // Best-effort analytics event.
  await trackEvent("email_submit", sessionId, null, null);

  return Response.json({ success: true });
}
