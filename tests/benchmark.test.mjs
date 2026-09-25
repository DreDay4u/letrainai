/**
 * Benchmark unit tests — the "typical for your size" score module.
 * Standalone (repo convention): bundles src/lib/assessment/* with esbuild.
 *
 *   1. typical scores match the hand-computed formula per size
 *   2. typical scores are monotonic non-decreasing across sizes
 *   3. benchmark savings bands match buildFallbackResult's estimated_savings
 *      (the two tables must never drift)
 *   4. verdict bands: above at +6, below at -6, average inside
 *   5. every size maps (no undefined lookups)
 *
 * Run: node tests/benchmark.test.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = "/tmp/benchmark-unit";
mkdirSync(out, { recursive: true });

for (const mod of ["schema", "fallback", "benchmark"]) {
  execSync(
    `npx esbuild src/lib/assessment/${mod}.ts --bundle --format=esm --platform=node --outfile=${out}/${mod}.mjs`,
    { cwd: root, stdio: "pipe" }
  );
}

const schema = await import(`${out}/schema.mjs`);
const fallback = await import(`${out}/fallback.mjs`);
const benchmark = await import(`${out}/benchmark.mjs`);

let pass = 0;
let fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.error(`FAIL ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

const SIZES = ["1-5", "6-20", "21-50", "51-200", "200+"];

// 1. Formula expectations: 35 base + 16 (2 sinks) + 6 (efficiency)
//    + 8 unless size is 1-5. No pair/none bonuses in the typical profile.
const expected = { "1-5": 57, "6-20": 65, "21-50": 65, "51-200": 65, "200+": 65 };
for (const size of SIZES) {
  const b = benchmark.getSizeBenchmark(size);
  check(`typical score ${size} = ${expected[size]}`, b.typicalScore === expected[size], `got ${b.typicalScore}`);
}

// 2. Monotonic non-decreasing
const scores = SIZES.map((s) => benchmark.getSizeBenchmark(s).typicalScore);
check(
  "typical scores monotonic non-decreasing",
  scores.every((v, i) => i === 0 || v >= scores[i - 1]),
  scores.join(",")
);

// 3. Savings bands never drift from the fallback engine
for (const size of SIZES) {
  const answers = {
    industry: "Retail/E-commerce",
    company_size: size,
    time_sinks: ["data_entry"],
    current_tools: ["email"],
    biggest_challenge: "efficiency",
  };
  const result = fallback.buildFallbackResult(answers);
  const b = benchmark.getSizeBenchmark(size);
  check(
    `savings band ${size} matches fallback engine`,
    b.savingsBand === result.estimated_savings,
    `benchmark=${b.savingsBand} fallback=${result.estimated_savings}`
  );
}

// 4. Verdict bands
const checkEq = (a, b) => a === b;
check("verdict above at +6", checkEq(benchmark.benchmarkVerdict(71, 65), "above"));
check("verdict below at -6", checkEq(benchmark.benchmarkVerdict(59, 65), "below"));
check("verdict average inside band", checkEq(benchmark.benchmarkVerdict(65, 65), "average"));
check("verdict average at +5", checkEq(benchmark.benchmarkVerdict(70, 65), "average"));

// 5. Every size in the schema enum resolves
for (const size of schema.companySizeSchema.options) {
  const b = benchmark.getSizeBenchmark(size);
  check(`size ${size} resolves`, typeof b.typicalScore === "number" && b.savingsBand.length > 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
