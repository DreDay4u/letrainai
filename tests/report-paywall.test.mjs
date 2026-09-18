/**
 * Paid report product unit tests — standalone (repo convention, no vitest).
 * Bundles src/lib with esbuild, then exercises:
 *   1. full result schema requires the paid `report` object
 *   2. maskFreeResult leaks nothing behind the paywall
 *   3. fallback builds a complete paid report
 *   4. tier schema accepts exactly report|session
 *   5. webhook signature verification (valid / tampered / wrong secret)
 *
 * Run: node tests/report-paywall.test.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = "/tmp/paywall-unit";
mkdirSync(out, { recursive: true });

for (const mod of ["schema", "fallback", "report"]) {
  execSync(
    `npx esbuild src/lib/assessment/${mod}.ts --bundle --format=esm --platform=node --outfile=${out}/${mod}.mjs`,
    { cwd: root, stdio: "pipe" }
  );
}

// payments.ts lives in src/lib/, not src/lib/assessment/
execSync(
  `npx esbuild src/lib/payments.ts --bundle --format=esm --platform=node --outfile=${out}/payments.mjs`,
  { cwd: root, stdio: "pipe" }
);

const schema = await import(`${out}/schema.mjs`);
const fallback = await import(`${out}/fallback.mjs`);
const report = await import(`${out}/report.mjs`);
const payments = await import(`${out}/payments.mjs`);
const { default: Stripe } = await import("stripe");

let pass = 0;
let fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name} ${extra}`);
  }
}

const validReport = {
  summary: "S".repeat(50),
  roadmap: [
    { phase: "Days 0-14", focus: "Pilot", actions: ["A1", "A2"] },
    { phase: "Days 15-45", focus: "Expand", actions: ["B1", "B2"] },
    { phase: "Days 46-90", focus: "Integrate", actions: ["C1", "C2"] },
  ],
  tool_stack: [
    { category: "C1", recommendation: "R1", est_monthly_cost: "$10/mo" },
    { category: "C2", recommendation: "R2", est_monthly_cost: "$20/mo" },
    { category: "C3", recommendation: "R3", est_monthly_cost: "$30/mo" },
  ],
  roi: { setup_cost: "$1,000", monthly_savings: "$2,000/mo", break_even: "1 month", first_year_net: "$20K net" },
};

const fullResult = {
  opportunity_score: 72,
  estimated_savings: "$23K-$47K/year",
  recommendations: [
    { title: "Rec One", description: "D", difficulty: "low", impact: "significant", estimated_time_saved: "6-12 hours/week" },
    { title: "Rec Two SECRET", description: "D", difficulty: "medium", impact: "moderate", estimated_time_saved: "4-8 hours/week" },
    { title: "Rec Three SECRET", description: "D", difficulty: "high", impact: "transformative", estimated_time_saved: "2-4 hours/week" },
  ],
  next_steps: "SECRET next steps",
  disclaimer: "Estimates only.",
  report: validReport,
};

/* 1. schema requires report */
{
  const withReport = schema.assessmentResultSchema.safeParse(fullResult);
  check("full result with report parses", withReport.success, JSON.stringify(withReport).slice(0, 200));

  const noReport = schema.assessmentResultSchema.safeParse({ ...fullResult, report: undefined });
  check("result without report rejected", !noReport.success);
}

/* 2. maskFreeResult leaks nothing */
{
  const masked = report.maskFreeResult(fullResult);
  const serialized = JSON.stringify(masked);

  check("masked has exactly 1 recommendation", masked.recommendations.length === 1);
  check("masked locked_count correct", masked.locked_count === 2, `got ${masked.locked_count}`);
  check("masked keeps score/savings", masked.opportunity_score === 72 && masked.estimated_savings === fullResult.estimated_savings);
  check("masked keeps disclaimer", masked.disclaimer === fullResult.disclaimer);
  check("masked lists locked sections", Array.isArray(masked.locked_sections) && masked.locked_sections.length === 4);

  check("no paid recs in payload", !serialized.includes("SECRET"));
  check("no next_steps in payload", !("next_steps" in masked) && !serialized.includes("SECRET next steps"));
  check("no report object in payload", !("report" in masked));
  check("no roadmap data in payload", !serialized.includes('"roadmap"'));
  check("no tool_stack data in payload", !serialized.includes('"tool_stack"'));
  check("no roi data in payload", !serialized.includes('"roi"'));
}

/* 3. fallback builds complete paid report */
{
  const answers = {
    industry: "Retail/E-commerce",
    company_size: "6-20",
    time_sinks: ["data_entry", "reporting"],
    current_tools: ["email", "spreadsheets"],
    biggest_challenge: "efficiency",
  };
  const fb = fallback.buildFallbackResult(answers);
  const valid = schema.assessmentResultSchema.safeParse(fb);
  check("fallback result with report schema-valid", valid.success, JSON.stringify(valid).slice(0, 300));

  check("fallback roadmap has 3 phases", fb.report.roadmap.length === 3);
  check("fallback tool_stack has 3+ rows", fb.report.tool_stack.length >= 3);
  check("fallback roi has all fields", Boolean(fb.report.roi.setup_cost && fb.report.roi.monthly_savings && fb.report.roi.break_even && fb.report.roi.first_year_net));
  check("fallback roadmap phases ordered", fb.report.roadmap[0].phase === "Days 0-14" && fb.report.roadmap[2].phase === "Days 46-90");
}

/* 4. tier schema */
{
  check("tier report accepted", schema.tierSchema.safeParse("report").success);
  check("tier session accepted", schema.tierSchema.safeParse("session").success);
  check("tier garbage rejected", !schema.tierSchema.safeParse("enterprise").success);
  check("TIERS priced", schema.TIERS.report.price === "$149" && schema.TIERS.session.price === "$499");
}

/* 5. webhook signature verification */
{
  process.env.STRIPE_SECRET_KEY = "sk_test_paywall_unit";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_paywall_unit";

  const stripe = new Stripe("sk_test_paywall_unit");
  const payload = JSON.stringify({
    id: "evt_test_1",
    object: "event",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_1", payment_status: "paid", client_reference_id: "sess-1", metadata: { session_id: "sess-1", tier: "report" } } },
  });

  const goodHeader = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: "whsec_paywall_unit",
  });
  let ok = true;
  try {
    const event = payments.verifyWebhookEvent(payload, goodHeader);
    ok = event.type === "checkout.session.completed";
  } catch (err) {
    ok = false;
    console.error(err.message);
  }
  check("valid signature verifies", ok);

  let tamperedRejected = false;
  try {
    payments.verifyWebhookEvent(payload.replace("paid", "unpaid"), goodHeader);
  } catch {
    tamperedRejected = true;
  }
  check("tampered payload rejected", tamperedRejected);

  let wrongSecretRejected = false;
  try {
    const badHeader = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_wrong" });
    payments.verifyWebhookEvent(payload, badHeader);
  } catch {
    wrongSecretRejected = true;
  }
  check("wrong secret rejected", wrongSecretRejected);

  let missingHeaderRejected = false;
  try {
    payments.verifyWebhookEvent(payload, null);
  } catch {
    missingHeaderRejected = true;
  }
  check("missing signature header rejected", missingHeaderRejected);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
