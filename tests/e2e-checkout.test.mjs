/**
 * E2E checkout flow — NOT part of `npm test` (needs live env + secrets).
 *
 * Drives the built server through the full paid-report funnel against Stripe
 * TEST mode: assessment -> masked free result -> checkout session created ->
 * locked report page -> signed webhook marks paid -> full report renders.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:4399 \
 *   STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_local_e2e \
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node tests/e2e-checkout.test.mjs
 */
import { randomUUID } from "node:crypto";
import { default as Stripe } from "stripe";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4399";
const key = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!key || !webhookSecret) {
  console.error("Need STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET env");
  process.exit(2);
}
const stripe = new Stripe(key);

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name} ${extra}`); }
}

const sid = `e2e-${randomUUID()}`;
const answers = {
  industry: "Retail/E-commerce",
  company_size: "6-20",
  time_sinks: ["data_entry", "reporting"],
  current_tools: ["email", "spreadsheets"],
  biggest_challenge: "efficiency",
};

/* 1. email capture at start */
{
  const res = await fetch(`${BASE}/api/assessment/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sid, email: "e2e@letrainai.test" }),
  });
  check("start capture 200", res.status === 200, `status ${res.status}`);
}

/* 2. assessment completes, response is masked */
{
  const res = await fetch(`${BASE}/api/assessment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sid, answers, turnstile_token: "" }),
  });
  const data = await res.json();
  check("assessment 200", res.status === 200, `status ${res.status}`);
  check("masked: exactly 1 recommendation", data.recommendations?.length === 1, JSON.stringify(data).slice(0, 120));
  check("masked: locked_count present", typeof data.locked_count === "number" && data.locked_count >= 2);
  check("masked: no report key", !("report" in data));
  check("masked: no next_steps", !("next_steps" in data));
}

/* 3. checkout session created */
let checkoutUrl = "";
{
  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sid, tier: "report" }),
  });
  const data = await res.json();
  checkoutUrl = data.url ?? "";
  check("checkout 200", res.status === 200, `status ${res.status} ${JSON.stringify(data).slice(0, 120)}`);
  check("checkout url is a stripe checkout page", /checkout\.stripe\.com/.test(checkoutUrl), checkoutUrl);
}

/* 3b. invalid tier rejected */
{
  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sid, tier: "enterprise" }),
  });
  check("invalid tier 400", res.status === 400, `status ${res.status}`);
}

/* 3c. unknown session 404 */
{
  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: "e2e-nope-00000000", tier: "report" }),
  });
  check("unknown session 404", res.status === 404, `status ${res.status}`);
}

/* 4. report page locked pre-payment */
{
  const res = await fetch(`${BASE}/report/${sid}`);
  const html = await res.text();
  check("locked report 200", res.status === 200);
  check("locked page shows unlock", /Unlock|unlock/i.test(html));
  check("locked page hides roadmap section", !/implementation roadmap/.test(html));
}

/* 5. signed webhook marks paid */
{
  const event = JSON.stringify({
    id: `evt_${randomUUID()}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_e2e_${randomUUID()}`,
        object: "checkout_session",
        payment_status: "paid",
        client_reference_id: sid,
        metadata: { session_id: sid, tier: "report" },
      },
    },
  });
  const header = stripe.webhooks.generateTestHeaderString({ payload: event, secret: webhookSecret });

  const bad = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": "t=1,v1=deadbeef" },
    body: event,
  });
  check("bad signature 400", bad.status === 400, `status ${bad.status}`);

  const good = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": header },
    body: event,
  });
  const goodData = await good.json();
  check("signed webhook 200", good.status === 200, `${good.status} ${JSON.stringify(goodData)}`);
  check("webhook marked session", goodData.marked === sid || goodData.received === true);

  // replay must be idempotent (second delivery still 200)
  const replay = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": header },
    body: event,
  });
  check("webhook replay idempotent 200", replay.status === 200, `status ${replay.status}`);
}

/* 6. report unlocked after payment */
{
  const res = await fetch(`${BASE}/report/${sid}`);
  const html = await res.text();
  check("unlocked report 200", res.status === 200);
  check("full report shows roadmap", /90-day implementation roadmap/i.test(html));
  check("full report shows ROI", /ROI projection/i.test(html));
  check("full report shows tool stack", /Recommended tool stack/i.test(html));
}

/* 7. double-checkout redirects to report instead of charging twice */
{
  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sid, tier: "report" }),
  });
  const data = await res.json();
  check("already-paid returns report url", data.already_paid === true && /\/report\//.test(data.url ?? ""), JSON.stringify(data).slice(0, 120));
}

/* 8. unknown report session */
{
  const res = await fetch(`${BASE}/report/e2e-nope-00000000`);
  const html = await res.text();
  check("unknown report not-found view", res.status === 200 && /Report not found/i.test(html));
}

/* 9. refunds page live */
{
  const res = await fetch(`${BASE}/refunds`);
  const html = await res.text();
  check("refunds page 200", res.status === 200 && /Refund Policy/i.test(html));
}

/* 10. cleanup test row (best-effort) */
{
  const url = process.env.SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && svc) {
    const res = await fetch(`${url}/rest/v1/assessment_results?session_id=eq.${sid}`, {
      method: "DELETE",
      headers: { apikey: svc, Authorization: `Bearer ${svc}` },
    });
    check("cleanup deleted test row", res.ok, `status ${res.status}`);
  } else {
    console.log("SKIP cleanup (no SUPABASE_URL/SERVICE_KEY env)");
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
