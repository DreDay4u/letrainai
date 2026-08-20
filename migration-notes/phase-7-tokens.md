# Phase 7 — OKLCH Token System (Direction C)

Date: 2026-08-20 · Branch: `migration/astro7-p7` · Owner: Designer
Source: `/home/andre/LeTrainAI-design-research/token-direction.md` (Oracle, live-verified) + `scripts/contrast-gate.py` (this repo, WCAG 2.1 relative-luminance math, Björn Ottosson OKLCH→sRGB matrices).

## Direction

**Direction C — hybrid light/dark section alternation** (Mercury-style film-edit rhythm). Light "paper" world carries the institutional daylight identity; the scrollytelling section and closing CTA band go dark ("abyss", deep green-black) where gold works as a light source. Alternation *is* the pacing: dark = "inside the machine," light = "business outcomes." Direction B's deeper `abyss-950` (L 0.145) is reserved for the pinned sequence's vignette; the act-3 background tweens L 0.19 → 0.17 as connections complete.

## Bugs fixed (found during audit, beyond the brief)

1. **Gold-as-text AA failure** — legacy `--color-gold: #B8860B` = 3.06:1 on canvas (fails AA 4.5:1). Replaced with a ramp where gold text is only `gold-600` (#976700, 4.65:1 AA on canvas) or `gold-700` (#7c5000, 6.54:1). `gold-glow` (#e0af3b, 9.07:1) and `gold-300` are dark-world-only. The retired value survives only as a documented reference in the gate script.
2. **Duplicate `--color-muted` declaration** — legacy `@theme` declared `--color-muted: #8A847B` (line 22) and `--color-muted: var(--color-surface-deep)` (line 40, shadcn mapping). Last declaration wins → `text-muted` rendered `#E8E0D2` = **1.23:1 on canvas (invisible)**. ~30 usage sites across services/process/faq/case-studies/blog + both React forms were affected. Fix: `--color-muted: oklch(0.470 0.012 80)` (#5e5a53, 6.43:1 AA) as a *text* token; the shadcn surface need is served by `--color-muted-foreground: var(--color-muted)` with no second `--color-muted` declaration. Zero page edits needed.
3. **Pink surface** — `--color-surface: #F2DEE4` was pink, not the research-verified paper `#f2ede4`. Corrected to `oklch(0.948 0.013 82.4)`.
4. **Hue-91 brown dark surface** — legacy `--color-dark-surface: #1F1E1B` (brown cast) remapped to brand-aligned green-cast `abyss-900`. `--color-dark-surface` kept as alias so `bg-dark-surface` (about.astro, process.astro, index) resolves without edits.

## Token groups

| Group | Tokens | Notes |
|---|---|---|
| Paper surfaces | `canvas` `surface` `surface-deep` `hairline` | L 0.979 → 0.866, chroma ≤ 0.021, hue ~81-88 (warm paper) |
| Light text | `ink` `body` `muted` | 16.65 / 10.65 / 6.43:1 on canvas |
| Green ramp | `forest-700/600/500` + legacy `accent`/`accent-hover` aliases | hue 163→150 (brand #1b4332 anchor unchanged); forest-500 brightened to L 0.60 for dark-world lines (4.85:1 on abyss-900) |
| Gold ramp | `gold-700/600/500/300` + `gold-glow`, legacy `gold` alias → gold-600 | usage rules locked: 600/700 = text on paper; 500 = rules/borders; 300/glow = dark-world accents |
| Abyss world | `abyss-950/900/800` `paper-on-dark` `mist-on-dark` | `dark-surface` alias → abyss-900; dark sections get `.color-scheme-dark` so native UI doesn't flash |
| Typography | `--font-sans/serif/mono/heading` + `--text-hero` (clamp 2.5→4.25rem) + `--text-display` | Fraunces display on Inter body, Geist Mono labels — brand stack unchanged |
| Spacing | Tailwind v4 default 0.25rem base + `--container-site` 72rem, `--container-prose` 46rem | institutional measure |
| Radii | `--radius` family ×0.6–3.0 of 0.5rem base | restrained, not pill |
| Shadows | `--shadow-card` `--shadow-lift` `--shadow-glow-gold` | hue-tinted oklch shadows, never pure black on paper |
| Motion | `--ease-premium/fluid/smooth` (custom cubic-beziers, no `ease-in-out`), `--duration-fast/base/slow/cinema` (150/220/420/800ms), `--animate-rise/fade-in/march` keyframes | march = SVG dash-flow vocabulary for act-3 + mobile static |

## Verified contrast ledger (scripts/contrast-gate.py, exit 0)

All 30 text/non-text pairs pass: gold-600/canvas 4.65 AA · gold-700/canvas 6.54 · gold-700/surface 5.97 · gold-glow/abyss-900 9.07 AAA · gold-glow/abyss-800 8.03 AAA · paper-on-dark/abyss-900 16.07 AAA · mist-on-dark/abyss-900 9.84 AAA · forest-500/abyss-900 4.85 · ink/canvas 16.65 AAA · muted/canvas 6.43 AA · white/forest-700 11.09 AAA.

Re-run after any token tweak: chroma shifts move ratios non-linearly.

## Non-goals

- No purple, no AI-gradient blue-violet anywhere (hue discipline: greens 150–163, golds 75–90).
- No content/text changes — tokens + structure only (interior pages keep P2 parity).
- OKLCH ships directly (baseline-2023); no hex fallbacks needed for the supported matrix.
