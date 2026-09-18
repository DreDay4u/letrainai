-- 2026-09-18 — Paid Full Report product (Stripe checkout + unlock)
--
-- Extends assessment_results for the paid tier. The wizard lifecycle status
-- ('started' | 'completed') is unchanged; payment state is tracked separately
-- so the two vocabularies never entangle.
--
-- payment_status: 'unpaid' (default) | 'paid'
-- paid_tier:      'report' ($149 full report) | 'session' ($499 report + strategy session)
-- Set by /api/checkout/success (verified against Stripe) and idempotently by
-- the /api/stripe/webhook handler (checkout.session.completed).

ALTER TABLE assessment_results
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_tier text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;
