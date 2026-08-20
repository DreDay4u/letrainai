# Phase 2 Report - Route Parity Port (Astro 7)

**Date:** 2026-08-20
**Branch:** migration/astro7-letrainai (from 9421e9e)
**Stack:** Astro 7.2.4, React 19 islands, Tailwind 4, @astrojs/node standalone

## Step 0 - Main fix (on main branch)
- Task named SHA c4af19e3 = phase 0 receipt + gitignore (NOT the hardening commit).
- Actual port-hardening commit = 852e25c1 (docker-compose 3102:3102 -> 127.0.0.1:3102:3102).
- Both cherry-picked to main: c7d942c3 (receipt) + b383391c (hardening). Pushed to origin/main.
- Verified: git show main:docker-compose.yml contains 127.0.0.1:3102:3102.

## What was ported
- globals.css -> src/styles/global.css: full Institution palette, shadcn semantic mappings, radius scale, Fraunces/Inter/Geist Mono via @fontsource (self-hosted; replaces next/font/google), tw-animate-css.
- BaseLayout.astro: per-page title/description/canonical, OG + twitter, JSON-LD (Organization + WebSite, verbatim), skip-link, favicon.
- Header.astro (sticky nav 7 links + CTA; mobile via native <details>) + Footer.astro.
- Section.astro helper (px-6 py-16 sm:py-24 + max-w-6xl/3xl).
- 9 static pages native Astro: /, about, services, process, faq, blog, case-studies, dreday4u placeholder, contact/assessment shells.
- 2 React islands client:load: ContactForm.tsx (17.2KB) + AssessmentWizard.tsx (24.9KB) - mechanical transform from legacy (next/link->a, Section->div, lucide->inline SVG). Copy/classes preserved.
- Content: 3 posts + 3 case studies MDX copied unchanged to src/content/. lib/content.ts copied verbatim; marked render.
- SEO: robots.txt.ts, sitemap.xml.ts (9 static + 6 content routes), manifest.webmanifest.ts.
- Dockerfile: added COPY --from=builder /app/src/content ./src/content (runtime MDX reads).

## Gate results
1. npx astro check -> 0 errors, 0 warnings (25 files) after adding @types/node.
2. npm run build -> success (server output, 2.1s).
3. Docker image letrainai-astro:p2; container letrainai-astro-p2 on 127.0.0.1:3103.
4. All 12 routes 200 on both stacks. (First run: slug routes 302 - src/content missing in image; fixed via Dockerfile COPY + rebuild.)
5. 48 screenshots (12 routes x 2 stacks x 2 viewports) at migration-notes/screenshots/p2/.
   - Byte-delta: 0.2%-5.5% on all routes except dreday4u (82%, expected - placeholder).
   - H1/H2 text: 12/12 exact match between stacks.
   - Fonts verified in-browser: Fraunces 60px H1, Inter body, bg rgb(250,248,243) - identical computed styles.
   - Assessment island hydrates: select, Continue button, wizard present.

## Route table

| Route | HTTP (new/old) | Title parity | Screenshots |
|---|---|---|---|
| / | 200/200 | exact | home-{new,old}-{desktop,mobile}.png |
| /about | 200/200 | single suffix (legacy doubles - see deviations) | about-* |
| /services | 200/200 | single suffix | services-* |
| /process | 200/200 | single suffix | process-* |
| /faq | 200/200 | single suffix | faq-* |
| /contact | 200/200 | single suffix | contact-* |
| /assessment | 200/200 | single suffix | assessment-* |
| /blog | 200/200 | single suffix | blog-* |
| /case-studies | 200/200 | single suffix | case-studies-* |
| /blog/[slug] x3 | 200/200 | exact after suffix fix | blog_why-most-ai-projects-fail-and-how-yours-wont-* |
| /case-studies/[slug] x3 | 200/200 | exact after suffix fix | case-studies_ecommerce-order-processing-* |
| /dreday4u | 200/200 | DEV - placeholder (Keystatic Phase 3) | dreday4u-* |

## Deviations
1. dreday4u: legacy is Keystatic CMS admin catch-all (makePage(keystaticConfig)) — Next-coupled; needs @keystatic/astro wiring in Phase 3. Ported as static placeholder, route serves 200. CMS admin NOT functional in Astro yet.
2. Page titles: legacy metadata template appends "— LeTrainAI" to page titles, producing a DOUBLE suffix on static pages (e.g. "About — LeTrainAI — LeTrainAI") because page metadata already included the suffix. New pages use a single suffix. Slug pages match legacy exactly (suffix appended post-fix).
3. Fonts: next/font/google replaced by @fontsource self-hosted packages (same families/weights/subsets). Computed font-family strings differ slightly (no fallback-name entries); rendering verified identical.
4. API routes NOT ported (per plan): /api/assessment, /api/assessment/email, /api/contact, /api/keystatic, /api/graphql — Phases 4-6. Contact POST and assessment submit fail gracefully until then (contact swallows error and shows success; assessment shows error state with retry).
5. Mobile nav: React useState toggle replaced by native <details> element (no JS). Same links, same look.
6. Animations: legacy Reveal/AnimatedCounter/PageTransition components imported by NO page (verified via grep) — not ported, zero visual impact.
7. getStaticPaths present on slug routes but output is server mode — routes render dynamically per request (warnings in build log, behavior correct).
8. Sitemap/robots/manifest ported as API endpoints with same URL set as legacy.

## Verification evidence
- astro check 0 errors; build success; docker image built; container healthy on 3103.
- curl: 12/12 routes 200 new stack, 12/12 old stack.
- DOM text: H1 + H2 exact match all routes.
- Computed styles: Fraunces/Inter/#FAF8F3 identical.
- 48 screenshots on disk under migration-notes/screenshots/p2/.
