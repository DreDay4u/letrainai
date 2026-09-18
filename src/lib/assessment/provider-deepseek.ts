import type { AssessmentAnswers } from "./schema";

/**
 * DeepSeek provider — extracted VERBATIM (system prompt, model params,
 * timeout, retry policy) from legacy-next/src/app/api/assessment/route.ts.
 * Reads DEEPSEEK_API_KEY at runtime (process.env — Astro server runtime).
 */

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
export const DEEPSEEK_TIMEOUT_MS = 20_000;
export const DEEPSEEK_RETRIES = 1;
export const DEEPSEEK_RETRY_DELAY_MS = 3_000;

export const SYSTEM_PROMPT = `You are an expert AI business consultant. Analyze the business's assessment answers and provide a structured JSON response. Be specific, practical, and grounded. Never invent client statistics.

The response MUST be a single JSON object with EXACTLY these TOP-LEVEL fields:
{
  "opportunity_score": number 0-100,
  "estimated_savings": string like "$23K-$47K/year",
  "recommendations": array of 3-5 objects,
  "next_steps": string (max 200 chars),
  "disclaimer": string (max 400 chars),
  "report": object — the full paid report (see below)
}

Each object in "recommendations" MUST have EXACTLY these fields:
{
  "title": string (max 80 chars),
  "description": string (max 200 chars),
  "difficulty": "low" | "medium" | "high",
  "impact": "moderate" | "significant" | "transformative",
  "estimated_time_saved": string like "5-10 hours/week"
}

The "report" object MUST have EXACTLY these fields:
{
  "summary": string (max 400 chars) — an executive summary of their AI opportunity,
  "roadmap": array of 3-4 objects, each { "phase": string like "Days 0-14", "focus": string (max 80 chars), "actions": array of 2-5 strings (max 160 chars each) },
  "tool_stack": array of 3-6 objects, each { "category": string (max 40 chars), "recommendation": string (max 80 chars, generic tool category — no brand promises), "est_monthly_cost": string like "$20-$100/mo" },
  "roi": { "setup_cost": string like "$500-$2,500", "monthly_savings": string like "$1,900-$3,900/mo", "break_even": string like "2-4 months", "first_year_net": string like "$18K-$41K net" }
}

Order the roadmap as a realistic 90-day implementation plan (pilot first, then expand, then integrate/measure). Ground ROI in the estimated hours saved across recommendations at a ~$35/hr loaded cost.

IMPORTANT: "next_steps" and "disclaimer" go at the TOP LEVEL only — NEVER inside a recommendation object. Do not add any other fields anywhere. Respond with valid JSON only.`;

export async function callDeepSeek(answers: AssessmentAnswers): Promise<unknown> {
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
        max_tokens: 2200,
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
