# letrainai.com

Marketing + lead-gen site for LeTrain AI. **Astro 7 SSR** (`@astrojs/node`), React 19 islands, Tailwind 4, Keystatic CMS, self-hosted Supabase (leads, assessment results, analytics events), DeepSeek-powered assessment generator with deterministic fallback.

## Scripts

```bash
npm run dev      # astro dev
npm run build    # astro build (server output)
npm run check    # astro check (typecheck)
npm test         # node tests/assessment.test.mjs && node tests/contact-events.test.mjs
npm start        # node ./dist/server/entry.mjs
```

## Deploy

Push to `main` → GitHub → Coolify webhook → container rebuild → `/api/health` gate. Container serves loopback `:3103` inside the `coolify` + `supabase_default` docker networks; Cloudflare fronts the public domain.

> Note for local runs: `.env.local` points Supabase at `http://supabase-kong:8000`, a docker-network hostname. On the host, override `NEXT_PUBLIC_SUPABASE_URL` (e.g. the Kong bridge IP) or persistence is silently skipped.

## Key surfaces

- `/assessment` — 5-question AI assessment; email captured at start (`/api/assessment/start`), completion upserts the same row (`/api/assessment`)
- `/contact` — lead form (`contact_leads`)
- `/api/health`, `/api/events` — healthcheck + analytics ingest
- DB schema changes: `supabase/migrations/*.sql`, applied manually to the self-hosted instance (verified pre-apply on empty/low-risk tables)

## Ops

Maintained by the LeTrainAI agent (Hermes profile `letrenai`). Fleet docs: `~/brain/agents/letrenai.md`.
