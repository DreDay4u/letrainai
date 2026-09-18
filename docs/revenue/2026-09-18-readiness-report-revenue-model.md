# Revenue Model — AI Readiness Report (launched 2026-09-18)

Status: **LIVE in production** (deployed 2026-09-18, Stripe live-mode checkout verified end-to-end).
Owner: letrenai seat · Card: `letrainai` board `t_42cbb762`.

## The product

The free 3-minute AI assessment now generates a **full paid report server-side**
(all ranked opportunities, 90-day implementation roadmap, recommended tool
stack with monthly costs, ROI projection with break-even) and shows the
visitor a free teaser (opportunity score + savings band + their #1
opportunity). The full report unlocks via Stripe Checkout:

| Tier | Price | Delivers |
|------|-------|----------|
| Full AI Readiness Report | **$149** one-time | All opportunities, 90-day roadmap, tool stack + costs, ROI projection — rendered instantly at a private report URL |
| Report + Strategy Session | **$499** one-time | Everything above + a 60-minute implementation session (booked via /contact) |

Delivery is in-app (`/report/<session_id>`, gated on `payment_status='paid'`);
no outbound email is involved (pending Andre's approval for email delivery).
Refund policy: /refunds (14-day guarantee on the report).

## $10K/month math

The site now has a self-serve revenue rail that did not exist before.
Paths to $10,000/mo:

1. **Report only:** 67 sales/mo × $149 = $9,983
2. **Session-weighted:** 12 sessions × $499 + 27 reports × $149 = $9,999
3. **Consulting upsell:** every $499 buyer is a qualified consult lead; one
   retained automation engagement/mo at $10K+ dwarfs the product revenue —
   the funnel now self-qualifies and self-funds that pipeline.

### Required volume (honest assumptions)

Paid-report products on cold traffic typically convert 1–3% of assessment
*completers*. Working backwards at 2% buyer conversion:

| Sales/mo | Assessment completions/mo needed | At 25% wizard completion | Unique visitors/mo |
|----------|----------------------------------|--------------------------|--------------------|
| 67 (report-only path) | ~3,350 | ~13,400 | ~13,400+ |

That is a real traffic requirement — the rail is built and verified; volume
is the growth work (see levers). The session tier materially lowers it:
at a 3% session share of 200 sales/mo (6 × $499 = $2,994), the report
burden drops to ~47 sales (~2,350 completions).

## Levers (in impact order)

1. **Traffic to /assessment** — the assessment is already the conversion
   engine; blog/case-study CTAs, assessment links from every page's CTA row,
   and periodic LinkedIn/X distribution of the free tool.
2. **Price testing** — $149 is the opening price; $99/$199 A/B and a
   downsell (cancelled checkout → $99 offer) are one-line Stripe changes.
3. **Conversion polish** — paywall copy is functional v1; Lyra review
   queued (intercom). Teaser length, locked-card labels, and price anchor
   are the dials.
4. **Email delivery of reports** (needs Andre approval) — receipt + report
   link reduces "paid then lost the URL" support load and enables a dunning/
   abandonment sequence using the already-captured emails.
5. **Affiliate/partner distribution** — the product is fully self-serve,
   so partners (bookkeepers, MSPs, consultants) can send traffic with no
   fulfillment burden.

## Operations

- Stripe product `prod_VHU66gZatp7JVr`; prices
  `price_1UGv83A0aHMDGpS1wdmgyOYA` ($149) /
  `price_1UGv83A0aHMDGpS1WpOMeHKS` ($499).
- Webhook endpoint `we_1UGv83A0aHMDGpS1aIHUdM6m` →
  `https://letrainai.com/api/stripe/webhook` (`checkout.session.completed`).
- Coolify env: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_REPORT`,
  `STRIPE_PRICE_SESSION`, `STRIPE_WEBHOOK_SECRET` (prod + preview).
- Paid state is written by BOTH the verified success-redirect and the
  signature-verified webhook; the write is idempotent (unpaid-rows-only).
- **Kill switch (pause sales):** archive the two prices in Stripe
  (checkout returns 503), or `git revert 743b2fc4` + push. Refunds are
  handled manually via Stripe dashboard per /refunds.
- Payments appear in the shared Stripe account filtered by product
  "LeTrain AI — Full AI Readiness Report".

## Verification evidence (2026-09-18)

- Gates: `astro check` 0 errors · 60/60 unit tests · build green.
- Local E2E vs Stripe TEST mode: 25/25 (masking, checkout session, bad-signature
  rejection, signed webhook unlock, replay idempotency, double-pay guard).
- Live probes: masked free result on production DeepSeek path (no paid
  content in client payload); live checkout session created at
  checkout.stripe.com; locked report page pre-pay; full report (4 recs,
  3 roadmap phases, 5 tool rows, ROI) present server-side only; probe row
  deleted and session expired (no charge made).
- Deploy: main `743b2fc4`, container healthy, `/api/health` ok, all new
  routes 200/400 as designed.

## Follow-ups (flagged)

- GitHub→Coolify auto-deploy webhook silently declining pushes (secret
  mismatch) — secret re-synced 2026-09-18, verification pending next push
  (this doc's commit is the test).
- Lyra paywall-copy review.
- Email report delivery (needs Andre approval; AWS SES available).
- Wizard state restore after checkout cancel (v1: user retakes assessment
  or uses /report resume forms).
