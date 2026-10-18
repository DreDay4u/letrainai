# Cloudflare edge cache + zone rules (2026-10-18)

Zone `letrainai.com` (id `73e8e16bde9762a7168809e5fc326789`, Free plan) carries two
custom rules. This file is the in-repo record so zone state is not tribal knowledge.

## Cache rule — `letrainai_prerendered_html_edge_cache`

Phase `http_request_cache_settings`, set_cache_settings:

- **Matches** (positive list): `/`, `/about`, `/assessment`, `/blog`, `/blog/*`,
  `/case-studies`, `/case-studies/*`, `/contact`, `/faq`, `/pricing`, `/privacy`,
  `/process`, `/sample-report`, `/services`, `/terms`, `/sitemap.xml`
  — exactly the prerendered HTML routes (server routes `/api/*`, `/report/*`,
  `/keystatic*`, `/robots.txt` are NOT matched and stay uncached).
- **Edge TTL**: `override_origin` 300s. This is the freshness design: no purge
  mechanism exists, so a deploy's worst-case stale window is 5 minutes. Raise the
  TTL only after adding a deploy-time cache purge (purge token could not be minted
  with the 2026-10 vault token — no User API Tokens permission).
- **Browser TTL**: `respect_origin` — origin (@astrojs/node) sends
  `cache-control: public, max-age=0`, so browsers always revalidate; only the edge
  holds a copy.
- **Cache key**: query string excluded entirely (`custom_key.query_string.exclude.all`)
  — UTM/gclid variants share one entry. Safe because no prerendered page reads
  query params server-side (the assessment wizard handles them client-side).

## Response header rule — `letrainai_baseline_security_headers`

Phase `http_response_headers_transform`, rewrite, host-wide: sets
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()`.
App middleware sets the same four on on-demand routes; this rule extends coverage
to prerendered pages and static responses (middleware only runs at build time for
those — Astro node adapter serves them without it).

## Verification (2026-10-18)

- `cf-cache-status: HIT` on `/` (age increments), `MISS` → `HIT` on `/about`
- `/?utm_source=test` served from the SAME entry (identical age) — key works
- `/report/*`, `/api/*` → `DYNAMIC` (uncached)
- Edge TTFB: 43–72ms vs 239ms origin-SSR baseline before prerendering

## Rollback

Delete either rule: Rules → Cache Rules / Rules → Transform Rules → Response Header
in the Cloudflare dashboard, or `DELETE /zones/<id>/rulesets/<ruleset_id>` (cache
ruleset id: see `GET .../rulesets/phases/http_request_cache_settings/entrypoint`;
header ruleset id `c56b80fde4474ae49befc68384067619`).
