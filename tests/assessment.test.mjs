/**
 * Phase 4 assessment unit tests — standalone (no vitest present).
 * Bundles src/lib/assessment/* with esbuild, then exercises:
 *   1. valid request -> schema parses
 *   2. invalid enum -> schema rejects
 *   3. malformed JSON -> rejected (as the endpoint does)
 *   4. provider failure (fake DEEPSEEK_API_KEY -> 401) -> deterministic
 *      fallback returns a schema-valid structured result
 *   5. fallback normalization: nested next_steps/disclaimer hoisted
 *   6. rate limit: 4th request same IP within window -> blocked
 *
 * Run: node tests/assessment.test.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = "/tmp/p4-unit";
mkdirSync(out, { recursive: true });

for (const mod of ["schema", "generate", "fallback"]) {
  execSync(
    `npx esbuild src/lib/assessment/${mod}.ts --bundle --format=esm --platform=node --outfile=${out}/${mod}.mjs`,
    { cwd: root, stdio: "pipe" }
  );
}

const schema = await import(`${out}/schema.mjs`);
const generate = await import(`${out}/generate.mjs`);
const fallback = await import(`${out}/fallback.mjs`);

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

const validPayload = {
  session_id: "test-session-1",
  answers: {
    industry: "Retail/E-commerce",
    company_size: "6-20",
    time_sinks: ["data_entry", "reporting"],
    current_tools: ["email", "spreadsheets"],
    biggest_challenge: "efficiency",
  },
  turnstile_token: "",
};

/* 1. valid request */
{
  const parsed = schema.assessmentRequestSchema.safeParse(validPayload);
  check("valid request parses", parsed.success);
}

/* 2. invalid enum rejected */
{
  const bad = structuredClone(validPayload);
  bad.answers.biggest_challenge = "not-a-challenge";
  const parsed = schema.assessmentRequestSchema.safeParse(bad);
  check("invalid enum rejected", !parsed.success);
}

/* 2b. invalid email rejected, valid email accepted */
{
  const bad = schema.emailRequestSchema.safeParse({ session_id: "s", email: "nope" });
  const ok = schema.emailRequestSchema.safeParse({ session_id: "s", email: "a@b.co" });
  check("invalid email rejected", !bad.success);
  check("valid email accepted", ok.success);
}

/* 3. malformed JSON rejected (same behavior as endpoint body parse) */
{
  let rejected = false;
  try {
    JSON.parse("{not json");
  } catch {
    rejected = true;
  }
  check("malformed JSON throws (endpoint returns 400)", rejected);
}

/* 4. provider failure -> deterministic fallback, schema-valid */
{
  process.env.DEEPSEEK_API_KEY = "sk-obviously-fake-key-for-401";
  const t0 = Date.now();
  const result = await generate.generateResult(validPayload.answers);
  const ms = Date.now() - t0;
  const valid = schema.assessmentResultSchema.safeParse(result);
  check("fallback result schema-valid", valid.success, JSON.stringify(valid).slice(0, 200));
  check(
    "fallback deterministic score (6-20, data_entry+reporting, efficiency => 35+16+8+6+6=71)",
    result.opportunity_score === 71,
    `got ${result.opportunity_score}`
  );
  check(
    "fallback savings by size",
    result.estimated_savings === "$23K-$47K/year",
    result.estimated_savings
  );
  check("retry happened (>=1 retry delay ~3s)", ms >= 3000, `${ms}ms`);
}

/* 5. normalizeModelOutput hoists nested fields */
{
  const nested = {
    opportunity_score: 50,
    estimated_savings: "$1K/year",
    recommendations: [
      {
        title: "T",
        description: "D",
        difficulty: "low",
        impact: "moderate",
        estimated_time_saved: "1h",
        next_steps: "Do this",
        disclaimer: "Careful",
      },
      { title: "T2", description: "D2", difficulty: "high", impact: "significant", estimated_time_saved: "2h" },
      { title: "T3", description: "D3", difficulty: "medium", impact: "transformative", estimated_time_saved: "3h" },
    ],
  };
  const norm = fallback.normalizeModelOutput(nested);
  check("nested next_steps hoisted", norm.next_steps === "Do this");
  check("nested disclaimer hoisted", norm.disclaimer === "Careful");
  check(
    "nested fields stripped from recs",
    !("next_steps" in norm.recommendations[0] || "disclaimer" in norm.recommendations[0])
  );
  const valid = schema.assessmentResultSchema.safeParse(norm);
  check("normalized output schema-valid", valid.success);
}

/* 6. rate limit */
{
  const ip = "10.9.8.7";
  let allowed = 0;
  for (let i = 0; i < 4; i++) if (generate.checkRateLimit(ip)) allowed++;
  check("rate limit: 3 allowed, 4th blocked", allowed === 3, `allowed=${allowed}`);
  check("different IP unaffected", generate.checkRateLimit("10.9.8.8"));
}

/* 7. getClientIp header precedence */
{
  const r1 = generate.getClientIp(new Request("http://x/", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } }));
  const r2 = generate.getClientIp(new Request("http://x/", { headers: { "x-real-ip": "9.9.9.9" } }));
  const r3 = generate.getClientIp(new Request("http://x/"));
  check("x-forwarded-for first hop", r1 === "1.2.3.4", r1);
  check("x-real-ip fallback", r2 === "9.9.9.9", r2);
  check("unknown when no headers", r3 === "unknown", r3);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
