import type { AssessmentResult } from "./schema";

/**
 * Free-tier projection of a generated assessment result.
 *
 * The server generates the FULL result (free teaser + paid report sections)
 * and persists it to Supabase. This projection is the ONLY thing the free
 * /api/assessment response may contain — everything behind the paywall
 * (recommendations beyond the first, next_steps, and the whole `report`
 * object) must never reach an unpaid client.
 */

export const LOCKED_SECTION_LABELS = [
  "All ranked opportunities",
  "90-day implementation roadmap",
  "Recommended tool stack with costs",
  "ROI projection & break-even analysis",
] as const;

export interface FreeResult {
  opportunity_score: number;
  estimated_savings: string;
  recommendations: AssessmentResult["recommendations"];
  locked_count: number;
  locked_sections: readonly string[];
  disclaimer: string;
}

export function maskFreeResult(result: AssessmentResult): FreeResult {
  return {
    opportunity_score: result.opportunity_score,
    estimated_savings: result.estimated_savings,
    recommendations: result.recommendations.slice(0, 1),
    locked_count: Math.max(result.recommendations.length - 1, 0),
    locked_sections: LOCKED_SECTION_LABELS,
    disclaimer: result.disclaimer,
  };
}
