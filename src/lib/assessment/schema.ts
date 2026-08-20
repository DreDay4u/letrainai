import { z } from "zod";

/**
 * Assessment schemas — extracted VERBATIM from
 * legacy-next/src/app/api/assessment/route.ts (Phase 4).
 * Request/response shapes must stay EXACTLY identical to legacy.
 */

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

export const companySizeSchema = z.enum(["1-5", "6-20", "21-50", "51-200", "200+"]);
export const timeSinkSchema = z.enum([
  "data_entry",
  "customer_support",
  "reporting",
  "scheduling",
  "documents",
  "other",
]);
export const challengeSchema = z.enum([
  "efficiency",
  "cost",
  "growth",
  "customer_experience",
  "compliance",
]);

export const answersSchema = z.object({
  industry: z.string().min(1).max(64),
  company_size: companySizeSchema,
  time_sinks: z.array(timeSinkSchema).min(1).max(8),
  current_tools: z.array(z.string().min(1).max(32)).min(1).max(10),
  biggest_challenge: challengeSchema,
});

export const assessmentRequestSchema = z.object({
  session_id: z.string().min(1).max(64),
  answers: answersSchema,
  turnstile_token: z.string().max(2048).optional().default(""),
});

export const recommendationSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  difficulty: z.enum(["low", "medium", "high"]),
  impact: z.enum(["moderate", "significant", "transformative"]),
  estimated_time_saved: z.string().min(1).max(40),
});

export const assessmentResultSchema = z.object({
  opportunity_score: z.number().min(0).max(100),
  estimated_savings: z.string().min(1).max(40),
  recommendations: z.array(recommendationSchema).min(3).max(5),
  next_steps: z.string().min(1).max(200),
  disclaimer: z.string().min(1).max(400),
});

export const emailRequestSchema = z.object({
  session_id: z.string().min(1).max(64),
  email: z.string().email().max(254),
});

export type AssessmentAnswers = z.infer<typeof answersSchema>;
export type AssessmentResult = z.infer<typeof assessmentResultSchema>;
export type AssessmentRequest = z.infer<typeof assessmentRequestSchema>;
export type EmailRequest = z.infer<typeof emailRequestSchema>;
