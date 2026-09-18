import {
  type AssessmentAnswers,
  type AssessmentResult,
  challengeSchema,
  companySizeSchema,
  paidReportSchema,
  recommendationSchema,
  timeSinkSchema,
  toolStackItemSchema,
} from "./schema";
import type { z } from "zod";

/**
 * Deterministic fallback engine — extracted VERBATIM from
 * legacy-next/src/app/api/assessment/route.ts (Phase 4).
 * Also exports normalizeModelOutput (output normalization) used by generate.ts.
 */

/* ------------------------------------------------------------------ */
/* Output normalization                                                */
/* ------------------------------------------------------------------ */

/**
 * Normalize raw model output before schema validation.
 * Handles the model's tendency to nest `next_steps`/`disclaimer`
 * inside recommendation objects instead of at the top level.
 */
export function normalizeModelOutput(raw: unknown): unknown {
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

  // Hoist a flat report (model sometimes puts roadmap/tool_stack/roi at the
  // top level instead of nesting under "report").
  if (
    !normalized.report &&
    (normalized.roadmap || normalized.tool_stack || normalized.roi)
  ) {
    normalized.report = {
      summary: normalized.summary ?? "",
      roadmap: normalized.roadmap ?? [],
      tool_stack: normalized.tool_stack ?? [],
      roi: normalized.roi ?? {},
    };
  }

  return normalized;
}

/* ------------------------------------------------------------------ */
/* Deterministic fallback result                                       */
/* ------------------------------------------------------------------ */

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

export function computeFallbackScore(answers: AssessmentAnswers): number {
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

export function buildFallbackResult(answers: AssessmentAnswers): AssessmentResult {
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
    report: buildFallbackReport(answers, recs.slice(0, 5)),
  };
}

/* ------------------------------------------------------------------ */
/* Deterministic paid report (fallback for the Full Readiness Report)  */
/* ------------------------------------------------------------------ */

const TOOL_BY_SINK: Record<
  z.infer<typeof timeSinkSchema>,
  z.infer<typeof toolStackItemSchema>
> = {
  data_entry: {
    category: "Data extraction",
    recommendation: "AI document/invoice extraction service",
    est_monthly_cost: "$30-$150/mo",
  },
  customer_support: {
    category: "Support automation",
    recommendation: "AI assistant trained on your help content",
    est_monthly_cost: "$50-$200/mo",
  },
  reporting: {
    category: "Reporting automation",
    recommendation: "Auto-compiled dashboard with AI summaries",
    est_monthly_cost: "$20-$100/mo",
  },
  scheduling: {
    category: "Scheduling",
    recommendation: "AI booking and reminder assistant",
    est_monthly_cost: "$10-$50/mo",
  },
  documents: {
    category: "Document processing",
    recommendation: "AI drafting and summarization workspace",
    est_monthly_cost: "$20-$100/mo",
  },
  other: {
    category: "Workflow automation",
    recommendation: "Automation platform connecting your tools",
    est_monthly_cost: "$30-$150/mo",
  },
};

const INTEGRATION_TOOL: z.infer<typeof toolStackItemSchema> = {
  category: "Integration layer",
  recommendation: "Connector/glue platform between your systems",
  est_monthly_cost: "$0-$75/mo",
};

const SETUP_COST_BY_SIZE: Record<z.infer<typeof companySizeSchema>, string> = {
  "1-5": "$500-$1,500",
  "6-20": "$1,000-$3,000",
  "21-50": "$2,000-$6,000",
  "51-200": "$4,000-$12,000",
  "200+": "$8,000-$25,000",
};

function hoursMidpoint(range: string): number {
  const m = range.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return (Number(m[1]) + Number(m[2])) / 2;
  const single = range.match(/(\d+)/);
  return single ? Number(single[1]) : 4;
}

function kRounded(value: number): string {
  const k = Math.round(value / 1000);
  return `$${k}K`;
}

export function buildFallbackReport(
  answers: AssessmentAnswers,
  recs: z.infer<typeof recommendationSchema>[]
): z.infer<typeof paidReportSchema> {
  const totalHours = recs.reduce((sum, r) => sum + hoursMidpoint(r.estimated_time_saved), 0);
  const LOADED_HOURLY = 35;
  const WEEKS = 4.33;
  const monthlyLow = Math.round(totalHours * LOADED_HOURLY * WEEKS * 0.75 / 100) * 100;
  const monthlyHigh = Math.round(totalHours * LOADED_HOURLY * WEEKS * 1.15 / 100) * 100;

  const setup = SETUP_COST_BY_SIZE[answers.company_size];
  const [setupLowS, setupHighS] = setup.replace(/\$/g, "").split("-").map((s) => Number(s.replace(/,/g, "")));
  const toolMid = recs.length * 75; // ~$75/mo midpoint per tool line
  const firstYearLow = monthlyLow * 12 - setupHighS - toolMid * 12;
  const firstYearHigh = monthlyHigh * 12 - setupLowS - toolMid * 12;

  const breakEvenLow = Math.max(1, Math.round(setupLowS / monthlyHigh));
  const breakEvenHigh = Math.max(breakEvenLow, Math.round(setupHighS / monthlyLow));

  const seen = new Set<string>();
  const toolStack = answers.time_sinks
    .map((sink) => TOOL_BY_SINK[sink])
    .filter((tool) => {
      if (seen.has(tool.category)) return false;
      seen.add(tool.category);
      return true;
    })
    .slice(0, 5);
  toolStack.push(INTEGRATION_TOOL);

  const topRec = recs[0];
  const secondRec = recs[1];
  const thirdRec = recs[2];

  return {
    summary: `Your answers point to ${SAVINGS_BY_SIZE[answers.company_size]} in annual savings across ${recs.length} automatable opportunities. The 90-day roadmap below sequences the fastest, highest-impact win — ${topRec ? topRec.title.toLowerCase() : "your top process"} — first, then expands into the full stack.`,
    roadmap: [
      {
        phase: "Days 0-14",
        focus: "Pilot the highest-impact opportunity",
        actions: [
          topRec ? `Pilot: ${topRec.title} — trial an AI tool on two weeks of real workload` : "Pick one repetitive process and trial an AI tool on it for two weeks",
          "Measure baseline hours and error rate before the pilot starts",
          "Define success up front (e.g. 30% time saved) so the go/no-go call is objective",
        ],
      },
      {
        phase: "Days 15-45",
        focus: "Expand to the next opportunities",
        actions: [
          secondRec ? `Roll out: ${secondRec.title.toLowerCase()}` : "Automate the second-highest-volume repetitive task",
          thirdRec ? `Roll out: ${thirdRec.title.toLowerCase()}` : "Automate reporting on the pilots' savings so far",
          "Document each automated workflow so a non-expert can operate it",
        ],
      },
      {
        phase: "Days 46-90",
        focus: "Integrate, measure, and decide what's next",
        actions: [
          "Connect the pilots into one end-to-end automated flow",
          `Compare measured savings against this report's projection (${kRounded(monthlyLow)}-${kRounded(monthlyHigh)}/mo)`,
          "Pick the next process to automate from the remaining opportunities",
        ],
      },
    ],
    tool_stack: toolStack,
    roi: {
      setup_cost: setup,
      monthly_savings: `$${monthlyLow.toLocaleString()}-$${monthlyHigh.toLocaleString()}/mo`,
      break_even: `${breakEvenLow}-${breakEvenHigh} months`,
      first_year_net: `${kRounded(firstYearLow)}-${kRounded(firstYearHigh)} net of setup and tools`,
    },
  };
}
