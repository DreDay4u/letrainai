/**
 * Phase 5+6 unit tests — contact action logic + public events schema.
 * Standalone (no vitest): bundles src/lib modules with esbuild, then runs.
 *
 *   1. contact: valid camelCase island payload -> normalized valid lead
 *   2. contact: missing name -> legacy error message
 *   3. contact: invalid email -> legacy error message
 *   4. contact: oversized message (>2000) -> legacy error message
 *   5. contact: non-object body -> rejected
 *   6. contact: rate limit 5 allowed / 6th blocked / other IP unaffected
 *   7. events: valid landing_view parses
 *   8. events: unknown event name rejected
 *   9. events: PII field (email/name/answers) rejected by .strict()
 *  10. events: utm/source fields accepted
 *
 * Run: node tests/contact-events.test.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = "/tmp/p56-unit";
mkdirSync(out, { recursive: true });

for (const mod of ["src/lib/contact", "src/lib/analytics/events"]) {
  const file = mod.split("/").pop();
  execSync(
    `npx esbuild ${mod}.ts --bundle --format=esm --platform=node --outfile=${out}/${file}.mjs`,
    { cwd: root, stdio: "pipe" }
  );
}

const contact = await import(`${out}/contact.mjs`);
const events = await import(`${out}/events.mjs`);

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

/* Island payload — exactly what ContactForm.tsx sends (camelCase) */
const islandPayload = {
  service: "AI Automation",
  name: "Smoke Test",
  industry: "SaaS",
  companySize: "6-20",
  email: "smoke@test.example",
  phone: "(555) 555-5555",
  preferredTime: "Morning",
  message: "Hello from the unit test",
};

/* 1. valid camelCase payload */
{
  const v = contact.validateContactPayload(islandPayload);
  check("valid island payload accepted", v.ok);
  if (v.ok) {
    check(
      "camelCase normalized to snake_case",
      v.lead.service_interest === "AI Automation" &&
        v.lead.company_size === "6-20" &&
        v.lead.preferred_time === "Morning"
    );
  }
}

/* 2. empty name (island always sends all keys; missing = "") */
{
  const v = contact.validateContactPayload({ ...islandPayload, name: "" });
  check(
    "empty name rejected with legacy message",
    !v.ok && v.message === "Name is required.",
    JSON.stringify(v)
  );
}

/* 3. invalid email */
{
  const v = contact.validateContactPayload({
    ...islandPayload,
    email: "not-an-email",
  });
  check(
    "invalid email rejected with legacy message",
    !v.ok && v.message === "Please enter a valid email address.",
    JSON.stringify(v)
  );
}

/* 4. oversized message */
{
  const v = contact.validateContactPayload({
    ...islandPayload,
    message: "x".repeat(2001),
  });
  check(
    "oversized message rejected",
    !v.ok && v.message === "Message must be 2000 characters or fewer.",
    JSON.stringify(v)
  );
}

/* 5. non-object body */
{
  const v = contact.validateContactPayload(["array"]);
  check(
    "array body rejected",
    !v.ok && v.message === "Request body must be a JSON object."
  );
}

/* 6. rate limit: 5 per IP per hour (legacy values).
 * isRateLimited returns TRUE = BLOCKED (legacy contact semantics). */
{
  contact.__resetContactRateLimit();
  const ip = "10.7.7.7";
  let blocked = 0;
  for (let i = 0; i < 6; i++) if (contact.isRateLimited(ip)) blocked++;
  check("rate limit: 5 allowed, 6th blocked", blocked === 1, `blocked=${blocked}`);
  check("different IP unaffected", !contact.isRateLimited("10.7.7.8"));
  contact.__resetContactRateLimit();
  check("reset hook clears limiter", !contact.isRateLimited(ip));
}

/* 7. valid event payload */
{
  const p = events.publicEventSchema.safeParse({
    event_name: "landing_view",
    page: "/",
    utm_source: "x",
  });
  check("valid landing_view parses", p.success);
}

/* 8. unknown event name */
{
  const p = events.publicEventSchema.safeParse({ event_name: "totally_made_up" });
  check("unknown event name rejected", !p.success);
}

/* 9. PII / smuggled fields rejected (.strict) */
{
  const email = events.publicEventSchema.safeParse({
    event_name: "cta_click",
    email: "a@b.c",
  });
  const rawAnswers = events.publicEventSchema.safeParse({
    event_name: "assessment_start",
    answers: { industry: "Retail" },
  });
  const extra = events.publicEventSchema.safeParse({
    event_name: "cta_click",
    custom_field: "oops",
  });
  check("PII email field rejected", !email.success);
  check("raw answers field rejected", !rawAnswers.success);
  check("unknown extra field rejected", !extra.success);
}

/* 10. allowed attribution fields */
{
  const p = events.publicEventSchema.safeParse({
    event_name: "contact_submit",
    session_id: "s-123",
    page: "/contact",
    cta_id: "hero-assessment",
    source: "footer",
    utm_medium: "email",
    utm_campaign: "launch",
  });
  check("attribution fields accepted", p.success);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
