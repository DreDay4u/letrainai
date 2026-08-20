import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

/**
 * AI Assessment API — POST /api/assessment
 *
 * Accepts the 5-question assessment answers, calls DeepSeek for a
 * personalized AI-opportunity report, and returns a validated result.
 * Falls back to a deterministic result when DeepSeek is unavailable.
 */

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

const companySizeSchema = z.enum(["1-5", "6-20", "21-50", "51-200", "200+"]);
const timeSinkSchema = z.enum([
  "data_entry",
  "customer_support",
  "reporting",
  "scheduling",
  "documents",
  "other",
]);
const challengeSchema = z.enum([
  "efficiency",
  "cost",
  "growth",
  "customer_experience",
  "compliance",
]);

const answersSchema = z.object({
  industry: z.string().min(1).max(64),
  company_size: companySizeSchema,
  time_sinks: z.array(timeSinkSchema).min(1).max(8),
  current_tools: z.array(z.string().min(1).max(32)).min(1).max(10),
  biggest_challenge: challengeSchema,
});

const assessmentRequestSchema = z.object({
  session_id: z.string().min(1).max(64),
  answers: answersSchema,
  turnstile_token: z.string().max(2048).optional().default(""),
});

const recommendationSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  difficulty: z.enum(["low", "medium", "high"]),
  impact: z.enum(["moderate", "significant", "transformative"]),
  estimated_time_saved: z.string().min(1).max(40),
});

const assessmentResultSchema = z.object({
  opportunity_score: z.number().min(0).max(100),
  estimated_savings: z.string().min(1).max(40),
  recommendations: z.array(recommendationSchema).min(3).max(5),
  next_steps: z.string().min(1).max(200),
  disclaimer: z.string().min(1).max(400),
});

type AssessmentAnswers = z.infer<typeof answersSchema>;
type AssessmentResult = z.infer<typeof assessmentResultSchema>;

/* ------------------------------------------------------------------ */
/* Module-level state (survives across requests — never recreated)     */
/* ------------------------------------------------------------------ */

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3; // requests per IP per hour
const rateLimitMap = new Map<string, number[]>();

const resultsCache = new Map<string, AssessmentResult>(); // session_id -> result
const MAX_CACHE_ENTRIES = 2000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (rateLimitMap.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (hits.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, hits);
    return false;
  }
  hits.push(now);
  rateLimitMap.set(ip, hits);

  // Bound memory: prune fully-expired entries when the map grows large.
  if (rateLimitMap.size > 10000) {
    for (const [key, times] of rateLimitMap) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        rateLimitMap.delete(key);
      }
    }
  }
  return true;
}

function cacheResult(sessionId: string, result: AssessmentResult) {
  if (resultsCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = resultsCache.keys().next().value;
    if (oldestKey !== undefined) resultsCache.delete(oldestKey);
  }
  resultsCache.set(sessionId, result);
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/* ------------------------------------------------------------------ */
/* DeepSeek call                                                       */
/* ------------------------------------------------------------------ */

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_TIMEOUT_MS = 20_000;
const DEEPSEEK_RETRIES = 1;
const DEEPSEEK_RETRY_DELAY_MS = 3_000;

const SYSTEM_PROMPT = `You are an expert AI business consultant. Analyze the business's assessment answers and provide a structured JSON response. Be specific, practical, and grounded. Never invent client statistics.

The response MUST be a single JSON object with EXACTLY these TOP-LEVEL fields:
{
  "opportunity_score": number 0-100,
  "estimated_savings": string like "$23K-$47K/year",
  "recommendations": array of 3-5 objects,
  "next_steps": string (max 200 chars),
  "disclaimer": string (max 400 chars)
}

Each object in "recommendations" MUST have EXACTLY these fields:
{
  "title": string (max 80 chars),
  "description": string (max 200 chars),
  "difficulty": "low" | "medium" | "high",
  "impact": "moderate" | "significant" | "transformative",
  "estimated_time_saved": string like "5-10 hours/week"
}

IMPORTANT: "next_steps" and "disclaimer" go at the TOP LEVEL only — NEVER inside a recommendation object. Do not add any other fields anywhere. Respond with valid JSON only.`;

async function callDeepSeek(answers: AssessmentAnswers): Promise<unknown> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        temperature: 0.3,
        max_tokens: 1000,
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Assessment answers:\n${JSON.stringify(answers)}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`DeepSeek API error: status ${res.status}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("DeepSeek returned an empty response");
    }
    return JSON.parse(content);
  } finally {
    clearTimeout(timeout);
  }
}

async function generateResult(
  answers: AssessmentAnswers
): Promise<AssessmentResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= DEEPSEEK_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, DEEPSEEK_RETRY_DELAY_MS));
    }
    try {
      const raw = await callDeepSeek(answers);
      const normalized = normalizeModelOutput(raw);
      const parsed = assessmentResultSchema.safeParse(normalized);
      if (parsed.success) return parsed.data;
      lastError = new Error("DeepSeek returned output that failed validation");
    } catch (err) {
      lastError = err;
    }
  }

  console.error(
    "[assessment] DeepSeek unavailable, returning fallback result:",
    lastError instanceof Error ? lastError.message : lastError
  );
  return buildFallbackResult(answers);
}

/* ------------------------------------------------------------------ */
/* Deterministic fallback result                                       */
/* ------------------------------------------------------------------ */

/**
 * Normalize raw model output before schema validation.
 * Handles the model's tendency to nest `next_steps`/`disclaimer`
 * inside recommendation objects instead of at the top level.
 */
function normalizeModelOutput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;

  const normalized: Record<string, unknown> = { ...obj };
  const recs = Array.isArray(obj.recommendations) ? obj.recommendations : [];

  // Hoist nested next_steps/disclaimer from the first recommendation
  // that has them, if missing at the top level.
  if (!normalized.next_steps) {
    for (const rec of recs) {
      if (
        typeof rec === "object" &&
        rec !== null &&
        typeof (rec as Record<string, unknown>).next_steps === "string"
      ) {
        normalized.next_steps = (rec as Record<string, unknown>).next_steps;
        break;
      }
    }
  }
  if (!normalized.disclaimer) {
    for (const rec of recs) {
      if (
        typeof rec === "object" &&
        rec !== null &&
        typeof (rec as Record<string, unknown>).disclaimer === "string"
      ) {
        normalized.disclaimer = (rec as Record<string, unknown>).disclaimer;
        break;
      }
    }
  }

  // Strip nested next_steps/disclaimer from recommendation objects.
  normalized.recommendations = recs.map((rec) => {
    if (typeof rec !== "object" || rec === null) return rec;
    const r = { ...(rec as Record<string, unknown>) };
    delete r.next_steps;
    delete r.disclaimer;
    return r;
  });

  return normalized;
}

const FALLBACK_RECS: Record<
  z.infer<typeof timeSinkSchema>,
  z.infer<typeof recommendationSchema>
> = {
  data_entry: {
    title: "Automate data entry with AI-powered extraction",
    description:
      "AI can read invoices, forms, and emails and enter them into your systems automatically — eliminating manual typing and the errors that come with it.",
    difficulty: "low",
    impact: "significant",
    estimated_time_saved: "6-12 hours/week",
  },
  customer_support: {
    title: "Deploy an AI support assistant for common questions",
    description:
      "An AI assistant trained on your policies can answer routine customer questions instantly, 24/7, and route the rest to your team.",
    difficulty: "medium",
    impact: "significant",
    estimated_time_saved: "8-15 hours/week",
  },
  reporting: {
    title: "Generate reports automatically from your data",
    description:
      "Connect your data sources so weekly and monthly reports compile themselves, with AI-written summaries your team can act on.",
    difficulty: "medium",
    impact: "significant",
    estimated_time_saved: "4-8 hours/week",
  },
  scheduling: {
    title: "Automate appointment scheduling and reminders",
    description:
      "AI scheduling handles bookings, rescheduling, and reminders automatically, cutting the back-and-forth with clients and staff.",
    difficulty: "low",
    impact: "moderate",
    estimated_time_saved: "3-6 hours/week",
  },
  documents: {
    title: "Streamline document processing and drafting",
    description:
      "AI can draft, summarize, and organize your documents — proposals, contracts, and internal files — in minutes instead of hours.",
    difficulty: "medium",
    impact: "significant",
    estimated_time_saved: "5-10 hours/week",
  },
  other: {
    title: "Audit your workflows for AI-ready processes",
    description:
      "A structured workflow audit identifies the repetitive tasks in your operation that are safest and most valuable to automate first.",
    difficulty: "low",
    impact: "moderate",
    estimated_time_saved: "2-5 hours/week",
  },
};

const FALLBACK_CHALLENGE_RECS: Record<
  z.infer<typeof challengeSchema>,
  z.infer<typeof recommendationSchema>
> = {
  efficiency: {
    title: "Build a same-day AI efficiency pilot",
    description:
      "Pick one high-volume process and automate it end-to-end within two weeks, so your team sees immediate time savings.",
    difficulty: "low",
    impact: "significant",
    estimated_time_saved: "5-10 hours/week",
  },
  cost: {
    title: "Reduce labor hours on your most expensive process",
    description:
      "AI automation cuts the hours spent on your costliest recurring task, lowering effective labor cost without headcount changes.",
    difficulty: "medium",
    impact: "significant",
    estimated_time_saved: "4-8 hours/week",
  },
  growth: {
    title: "Free your team to focus on revenue-generating work",
    description:
      "Automate the busywork so your people can spend their time on sales, delivery, and client relationships that grow the business.",
    difficulty: "medium",
    impact: "transformative",
    estimated_time_saved: "6-12 hours/week",
  },
  customer_experience: {
    title: "Respond to customers in minutes, not days",
    description:
      "AI triage and drafting cut response times dramatically, keeping clients happy without adding support staff.",
    difficulty: "low",
    impact: "significant",
    estimated_time_saved: "3-7 hours/week",
  },
  compliance: {
    title: "Automate compliance documentation and tracking",
    description:
      "AI keeps your compliance records organized and up to date, reducing audit prep time and the risk of missed requirements.",
    difficulty: "high",
    impact: "significant",
    estimated_time_saved: "4-6 hours/week",
  },
};

const SAVINGS_BY_SIZE: Record<z.infer<typeof companySizeSchema>, string> = {
  "1-5": "$8K-$18K/year",
  "6-20": "$23K-$47K/year",
  "21-50": "$40K-$85K/year",
  "51-200": "$80K-$160K/year",
  "200+": "$150K-$300K/year",
};

function computeFallbackScore(answers: AssessmentAnswers): number {
  let score = 35;
  score += Math.min(answers.time_sinks.length * 8, 24);
  if (answers.company_size !== "1-5") score += 8;
  if (
    answers.biggest_challenge === "efficiency" ||
    answers.biggest_challenge === "growth"
  ) {
    score += 6;
  }
  if (
    answers.time_sinks.includes("data_entry") &&
    answers.time_sinks.includes("reporting")
  ) {
    score += 6;
  }
  if (answers.current_tools.includes("none")) score += 6;
  return Math.min(95, Math.max(30, score));
}

function buildFallbackResult(answers: AssessmentAnswers): AssessmentResult {
  const recs: z.infer<typeof recommendationSchema>[] = answers.time_sinks
    .map((sink) => FALLBACK_RECS[sink])
    .slice(0, 4);
  const challengeRec = FALLBACK_CHALLENGE_RECS[answers.biggest_challenge];
  if (challengeRec && recs.length < 5) {
    recs.push(challengeRec);
  }
  if (recs.length < 3) {
    recs.push(FALLBACK_RECS.other);
  }

  return {
    opportunity_score: computeFallbackScore(answers),
    estimated_savings: SAVINGS_BY_SIZE[answers.company_size],
    recommendations: recs.slice(0, 5),
    next_steps:
      "Book a free 30-minute strategy call and we'll map these opportunities to a concrete implementation plan with pricing.",
    disclaimer:
      "Estimates are based on typical outcomes for businesses of your size and are indicative only — not a guarantee. Results vary by implementation and workflow complexity.",
  };
}

/* ------------------------------------------------------------------ */
/* Route handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: "You've reached the assessment limit. Try again in an hour." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assessmentRequestSchema.safeParse(body);
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

  const { session_id: sessionId, answers } = parsed.data;

  // Idempotency: return the cached result for a repeated session_id.
  const cached = resultsCache.get(sessionId);
  if (cached) return Response.json(cached);

  const result = await generateResult(answers);
  cacheResult(sessionId, result);

  // Best-effort persistence: save the result to Supabase. A DB failure
  // must never break the user's response.
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

  // Best-effort analytics event.
  await trackEvent("assessment_complete", sessionId, null, null);

  return Response.json(result);
}
