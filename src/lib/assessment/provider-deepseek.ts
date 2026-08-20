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
