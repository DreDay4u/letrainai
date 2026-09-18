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

/* ------------------------------------------------------------------ */
/* Paid report sections (Full AI Readiness Report)                     */
/* ------------------------------------------------------------------ */

export const roadmapPhaseSchema = z.object({
  phase: z.string().min(1).max(40), // e.g. "Days 0-14"
  focus: z.string().min(1).max(80),
  actions: z.array(z.string().min(1).max(160)).min(2).max(5),
});

export const toolStackItemSchema = z.object({
  category: z.string().min(1).max(40), // e.g. "Document processing"
  recommendation: z.string().min(1).max(80),
  est_monthly_cost: z.string().min(1).max(40), // e.g. "$20-$100/mo"
});

export const roiSchema = z.object({
  setup_cost: z.string().min(1).max(40),
  monthly_savings: z.string().min(1).max(40),
  break_even: z.string().min(1).max(80),
  first_year_net: z.string().min(1).max(80),
});

export const paidReportSchema = z.object({
  summary: z.string().min(1).max(400),
  roadmap: z.array(roadmapPhaseSchema).min(3).max(4),
  tool_stack: z.array(toolStackItemSchema).min(3).max(6),
  roi: roiSchema,
});

export const assessmentResultSchema = z.object({
  opportunity_score: z.number().min(0).max(100),
  estimated_savings: z.string().min(1).max(40),
  recommendations: z.array(recommendationSchema).min(3).max(5),
  next_steps: z.string().min(1).max(200),
  disclaimer: z.string().min(1).max(400),
  report: paidReportSchema,
});

export const emailRequestSchema = z.object({
  session_id: z.string().min(1).max(64),
  email: z.string().email().max(254),
});

export const assessmentStartRequestSchema = z.object({
  session_id: z.string().min(1).max(64),
  email: z.string().email().max(254),
});

export type AssessmentAnswers = z.infer<typeof answersSchema>;
export type AssessmentResult = z.infer<typeof assessmentResultSchema>;
export type PaidReport = z.infer<typeof paidReportSchema>;
export type AssessmentRequest = z.infer<typeof assessmentRequestSchema>;
export type EmailRequest = z.infer<typeof emailRequestSchema>;

/* ------------------------------------------------------------------ */
/* Paid product tiers                                                  */
/* ------------------------------------------------------------------ */

export const TIERS = {
  report: {
    label: "Full AI Readiness Report",
    price: "$149",
  },
  session: {
    label: "Report + Strategy Session",
    price: "$499",
  },
} as const;

export type Tier = keyof typeof TIERS;
export const tierSchema = z.enum(["report", "session"]);
