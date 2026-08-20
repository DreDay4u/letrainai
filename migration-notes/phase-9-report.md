# Phase 9 Report — Docker/Compose Conversion (Prepare + Test-Build Only)

**Date:** 2026-08-20 · **Branch:** migration/astro7-letrainai @ 939079b7 → +this commit · **Owner:** Arlo (cron)

## What changed
- **docker-compose.yml (new, repo root)** — replaced the legacy Next.js compose
  (which had been moved to `legacy-next/` earlier in the migration; it still
  carried 10 build args incl. 5 `R2_*` secrets baked at build time). New compose:
  single `astro` service, image `letrainai-astro:latest`, `127.0.0.1:3103:3103`
  (port-governance `astro-preview`, loopback-only), **zero build args**
  (secretless build mandatory), runtime `env_file: .env.local`, `restart:
  unless-stopped`, `init: true`, healthcheck on `/api/health` (30s interval,
  3 retries, 10s start period, 10s timeout), external networks `coolify` +
  `supabase_default`.
- **Dockerfile (hardened)** — runtime stage now runs as `USER node`
  (non-root, uid 1000), `PORT=3103` baked as default env, production
  `node_modules` installed in runner stage (required: `@astrojs/node`
  standalone `entry.mjs` imports astro + prod deps at runtime — it does NOT
  trace a minimal node_modules like Next.js standalone), `dist/` and
  `src/content/` copied with `--chown=node:node` (Keystatic local-mode
  needs disk write access to content dir for admin edits), `npm cache
  cleaned`. Zombie reaping via compose `init: true` (no dumb-init layer).
- **.dockerignore** — covers `node_modules`, `.next`, `dist`, `.astro`,
  `legacy-next`, `graphify-out`, `migration-notes`, `.git`, `.env*`.

## R2 verification (Task 4)
`grep -r R2_ src/` → **0 matches**. Astro app has no R2 references; P0 finding
confirmed: R2 is legacy-Next-only. All 5 `R2_*` vars remain untouched in
`.env.local` — they are inert in the Astro runtime (never referenced), and
removal is deferred to the cutover step per plan.

## Gates

| Gate | Result |
|---|---|
| `docker build -t letrainai-astro:p9 .` | ✅ PASS (exit 0) |
| `docker run -d … --env-file .env.local` → boot | ✅ PASS (booted, served) |
| `curl /api/health` | ✅ 200, JSON `{"status":"ok","ts":…}` |
| `curl /` | ✅ 200 |
| `curl /blog` | 200 ✅ |
| `curl /case-studies/ecommerce-order-processing` | ✅ 200 |
| Non-root (`docker exec … id`) | ✅ `uid=1000(node)` |
| Healthcheck command (exec'd in container) | ✅ exit 0 |
| `docker compose config` validates | ✅ |
| Zero build args in compose | ✅ (grep `args:` → 0) |
| Prod `letrainai-web-1` untouched | ✅ Up 5h, 3102 → 200 |
| Test container stopped + removed | ✅ (3103 released) |

## Image size
`letrainai-astro:p9` — **778 MB** (ARM64). Dominated by full production
node_modules (astro + react + keystatic + supabase-js + gsap etc.) required
by the non-tracing standalone adapter. A future phase could trim via an
explicit export list or `npm ci --omit=dev` pruning pass, but 778 MB is
acceptable for a single-service loopback deployment.

## Deviations
1. **Healthcheck uses `node -e fetch(...)` not wget/curl** — node:22-alpine
   ships no curl; busybox wget handles HTTP status codes unreliably for
   healthcheck semantics. Node's global fetch is guaranteed present (it IS
   the runtime) and was exec-verified inside the container (exit 0).
2. **No dumb-init installed** — task allowed "dumb-init OR init via compose";
   chose compose `init: true` (fewer moving parts, no extra layer).
3. **New compose file created rather than rewriting the old one in place** —
   the old Next compose had already been relocated to `legacy-next/docker-compose.yml`
   earlier in the migration; there was no root compose to rewrite. Reference
   for networks/port pattern retained via `legacy-next/` copy.

## Not done (deliberately)
- No deploy, no `docker compose up`, no Coolify changes, no port 3102
  changes. Test container fully torn down. `.env.local` untouched.
