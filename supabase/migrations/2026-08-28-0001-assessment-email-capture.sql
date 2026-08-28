-- 2026-08-28 — assessment email capture at START (Plan A growth, stage 1)
-- Table was empty at time of application (verified pre-apply), so both changes are zero-risk.
--
-- 1) Allow a "started" row to exist before answers/recommendation are known:
--    the wizard inserts (session_id, email) at step 1 and UPDATES the full
--    record on completion. Previously responses/recommendation were NOT NULL,
--    which forced capture to happen only after completion (the leak).
-- 2) UNIQUE (session_id) makes the start-insert idempotent and prevents row
--    fragmentation across retries (upsert target).

ALTER TABLE assessment_results ALTER COLUMN responses DROP NOT NULL;
ALTER TABLE assessment_results ALTER COLUMN recommendation DROP NOT NULL;

-- Partial unique index (matches the upsert conflict target; ignores NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS assessment_results_session_id_key
  ON assessment_results (session_id);

-- Status vocabulary: 'started' | 'completed'
-- (column already exists, free-text; app enforces the two values)
