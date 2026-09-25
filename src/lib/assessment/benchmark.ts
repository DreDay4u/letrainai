import type { z } from "zod";
import { companySizeSchema } from "./schema";
import { computeFallbackScore } from "./fallback";
import type { AssessmentAnswers } from "./schema";

/**
 * Peer benchmark for the opportunity score — "typical for your size".
 *
 * Computed with the SAME formula as the user's score (computeFallbackScore)
 * against a fixed median profile per company size, so the benchmark can
 * never drift from the scoring model. It is a modeled norm (the assessment
 * disclaimer already frames estimates as "typical outcomes for businesses
 * of your size"), not a claim about real cohort data.
 */

export type CompanySize = z.infer<typeof companySizeSchema>;

/** Median profile: 2 time sinks, efficiency focus, mainstream tool stack. */
const TYPICAL_PROFILE: Omit<AssessmentAnswers, "company_size"> = {
  industry: "Professional Services",
  time_sinks: ["data_entry", "customer_support"],
  current_tools: ["email", "spreadsheets"],
  biggest_challenge: "efficiency",
};

export interface SizeBenchmark {
  /** Modeled typical opportunity score for this company size (0-100). */
  typicalScore: number;
  /** The savings band already shown for this size (SAVINGS_BY_SIZE range). */
  savingsBand: string;
}

export function getSizeBenchmark(companySize: CompanySize): SizeBenchmark {
  const typicalScore = computeFallbackScore({
    ...TYPICAL_PROFILE,
    company_size: companySize,
  });
  return { typicalScore, savingsBand: SAVINGS_BANDS[companySize] };
}

/** Mirrors SAVINGS_BY_SIZE in fallback.ts — kept in sync there by tests. */
const SAVINGS_BANDS: Record<CompanySize, string> = {
  "1-5": "$8K-$18K/year",
  "6-20": "$23K-$47K/year",
  "21-50": "$40K-$85K/year",
  "51-200": "$80K-$160K/year",
  "200+": "$150K-$300K/year",
};

export type BenchmarkVerdict = "above" | "average" | "below";

/** ±6-point band around the typical score. */
export function benchmarkVerdict(
  score: number,
  typicalScore: number
): BenchmarkVerdict {
  if (score >= typicalScore + 6) return "above";
  if (score <= typicalScore - 6) return "below";
  return "average";
}
