# Phase 3 Report — Content Collections + Keystatic (LOCAL mode)

**Branch:** `migration/astro7-letrainai` (from `076200ef`)
**Date:** 2026-08-20

## What changed

- `src/content.config.ts` — two collections (`posts`, `caseStudies`) via Content Layer `glob()` loader + zod schemas matching legacy frontmatter exactly (field names, optionality; `isIllustrative: z.boolean().default(true)` mirrors legacy `!== "false"` coercion; `publishedAt: z.coerce.date()`). Schemas are `.strict()` so unknown frontmatter keys fail the build (gate d; also enforces structured-editorial-content decision).
- Content files: P2 had already staged byte-identical copies in `src/content/{posts,case-studies}/` (verified via diff vs `legacy-next/src/content/`); kept in place, bodies unchanged. MDX bodies contain no JSX/components (verified) — plain markdown renders identically.
- Pages rewritten to Astro 7 API (`getCollection`/`getEntry` + `render()` → `<Content />`): `blog.astro`, `blog/[slug].astro`, `case-studies.astro`, `case-studies/[slug].astro`, `sitemap.xml.ts`. All now `prerender = true` (static-first per runbook §4). Slug URLs preserved via `entry.id` (glob loader id = filename stem = legacy slug). Date-desc ordering preserved.
- Temporary runtime loader `src/lib/content.ts` **deleted**; `marked` dependency removed.
- `keystatic.config.ts` at repo root: `storage: { kind: 'local' }`, collections ported 1:1 from legacy. **Deviation:** `fields.document` → `fields.mdx` — in @keystatic/core 0.6.8 `document` is deprecated and writes `.mdoc` extensions (verified against installed package), which would hide the existing `.mdx` files from the admin. `fields.mdx` targets `.mdx` with the same editor features. `formatting/dividers/links` props don't exist on `fields.mdx` (TS error, verified) — document features configured via `options` if needed later.
- `astro.config.mjs`: added `mdx()` (@astrojs/mdx 7.0.7) — required to render `.mdx` through collections — and `keystatic()` (@keystatic/astro 6.0.0; peer astro `5 || 6 || 7` ✓). Integration injects `/keystatic/[...params]` (admin, SSR) + `/api/keystatic/[...params]` (local-mode FS API).
- `/dreday4u`: placeholder page → 302 redirect to `/keystatic` (URL compatibility kept).
- `src/middleware.ts` (new): sets `X-Robots-Tag: noindex, nofollow` on `/keystatic*` (injected route can't carry frontmatter).
- `robots.txt` already disallowed `/keystatic/` — unchanged.

## Gates

| # | Gate | Result |
|---|------|--------|
| a | `npx astro check` | ✅ 0 errors, 0 warnings (5 pre-existing hints) |
| b | `npm run build` | ✅ all 3+3 slug routes + lists prerendered |
| c | Docker :3103 vs :3102 (legacy prod) oracle | ✅ all tested routes 200; H1/H2 identical; full visible text identical after normalization |
| d | Bad frontmatter fails build | ✅ added `evilField` → `[InvalidContentEntryDataError] Unrecognized key "evilField"`, exit 1; reverted → build green |
| e | Keystatic admin loads | ✅ `/keystatic` 200 (4.9 KB shell, 7 astro-islands); `/api/keystatic/tree` 200 with real tree JSON (`no-cors: 1` header required — CSRF guard); `/dreday4u` 302 → `/keystatic` |
| f | isIllustrative badge | ✅ both occurrences render on `/case-studies/ecommerce-order-processing` (page callout + body blockquote) |

**Gate c notes (acceptable diffs, none introduced by Phase 3):**
1. Apostrophe entity: oracle `&#x27;` vs new `&#39;` — same rendered character, different encoder (marked vs Astro).
2. Legacy oracle `<title>` is `Blog — LeTrainAI — LeTrainAI` (double suffix — legacy bug we do not replicate).
3. New build renders mobile `<details>` nav summary text in HTML (P2 Header.astro, untouched this phase; hidden via CSS on desktop). Oracle (client-rendered Next) omits it.

## Deviations / notes

- `fields.mdx` replaces deprecated `fields.document` (see above) — empirically verified against installed 0.6.8.
- Astro 7 has no `getEntryOr404` (verified against installed types) — used `getEntry` + explicit redirect, preserving legacy redirect behavior.
- Keystatic LOCAL mode in Docker writes to the container filesystem (ephemeral) — fine for migration/dev per runbook; production publishing remains GitHub-mode (deferred, locked decision).
- Keystatic admin API requires `no-cors: 1` header per request (CSRF guard) — curl probes without it 400; that is expected behavior, not a defect.

## Graph tool evidence

- **jcodemunch**: indexed `~/LeTrainAI` (71 files); `search_text` located legacy `isIllustrative` usage (keystatic.config.tsx:35, legacy [slug] page, `src/lib/content.ts` coercion) and all `marked`/loader consumers before any file reads.
- **Context7** (`/withastro/docs`, `/thinkmill/keystatic`): glob loader + `src/content.config.ts` shape, `render()`/`<Content />` API, `collectionsBackwardsCompat` legacy flag (not needed — clean Content Layer), Keystatic local storage config, `document` field deprecation notice. Cross-checked against installed packages (`@keystatic/astro` 6.0.0 route injection, `@keystatic/core` 0.6.8 field extensions) — installed source was ground truth where they diverged.
