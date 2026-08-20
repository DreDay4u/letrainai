import { assessmentResultSchema, type AssessmentAnswers, type AssessmentResult } from "./schema";
import {
  DEEPSEEK_RETRIES,
  DEEPSEEK_RETRY_DELAY_MS,
  callDeepSeek,
} from "./provider-deepseek";
import { buildFallbackResult, normalizeModelOutput } from "./fallback";

/**
 * Orchestration: validate -> provider -> normalize/validate -> fallback.
 * Extracted from legacy-next/src/app/api/assessment/route.ts (Phase 4).
 */

export async function generateResult(
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
/* TRANSITIONAL: in-memory session result cache                        */
/* (Turnstile + durable cache/limiting is a later hardening pass.)     */
/* ------------------------------------------------------------------ */

const resultsCache = new Map<string, AssessmentResult>(); // session_id -> result
const MAX_CACHE_ENTRIES = 2000;

export function cacheResult(sessionId: string, result: AssessmentResult) {
  if (resultsCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = resultsCache.keys().next().value;
    if (oldestKey !== undefined) resultsCache.delete(oldestKey);
  }
  resultsCache.set(sessionId, result);
}

export function getCachedResult(sessionId: string): AssessmentResult | undefined {
  return resultsCache.get(sessionId);
}

/* ------------------------------------------------------------------ */
/* TRANSITIONAL: in-memory IP rate limit                               */
/* (Turnstile + durable limiting is a later hardening pass.)           */
/* ------------------------------------------------------------------ */

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3; // requests per IP per hour
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(ip: string): boolean {
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

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
