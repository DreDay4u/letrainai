/**
 * Unit tests — client IP resolution (rate-limit bypass fix).
 * Standalone (no vitest): bundles src/lib/client-ip.ts with esbuild, then runs.
 *
 *   1. CF-Connecting-IP wins over everything (Cloudflare-fronted site)
 *   2. spoofed x-forwarded-for cannot shadow the real proxy IP
 *   3. x-real-ip used when present
 *   4. last XFF entry (closest proxy) used when only XFF present
 *   5. no headers -> "unknown" (single shared bucket, fail closed)
 *
 * Run: node tests/client-ip.test.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = "/tmp/client-ip-unit";
mkdirSync(out, { recursive: true });

execSync(
  `npx esbuild src/lib/client-ip.ts --bundle --format=esm --platform=node --outfile=${out}/client-ip.mjs`,
  { cwd: root, stdio: "pipe" }
);

const { getClientIp } = await import(`${out}/client-ip.mjs`);

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

function req(headers) {
  return new Request("https://letrainai.com/api/x", { headers });
}

/* 1. CF-Connecting-IP preferred */
check(
  "cf-connecting-ip preferred",
  getClientIp(req({ "cf-connecting-ip": "203.0.113.9" })) === "203.0.113.9"
);

/* 2. spoofed XFF cannot shadow CF */
check(
  "spoofed xff ignored behind cf",
  getClientIp(
    req({
      "cf-connecting-ip": "203.0.113.9",
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
    })
  ) === "203.0.113.9"
);

/* 3. x-real-ip next */
check(
  "x-real-ip used when no cf header",
  getClientIp(
    req({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "1.2.3.4" })
  ) === "198.51.100.7"
);

/* 4. XFF only: LAST entry (closest proxy), not the spoofable first */
check(
  "xff last entry used (not first)",
  getClientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })) === "5.6.7.8"
);

/* 5. nothing -> unknown */
check("no headers -> unknown", getClientIp(req({})) === "unknown");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
