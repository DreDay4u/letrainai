import { z } from "zod";

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

  // TODO: persist to Supabase (wired separately).
  console.log(
    `[assessment] email capture session=${sessionId} email=${email}`
  );

  return Response.json({ success: true });
}
