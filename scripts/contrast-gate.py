#!/usr/bin/env python3
"""Phase 7 contrast gate — WCAG 2.1 relative luminance, OKLCH -> sRGB.
Every token pair used as text must pass AA 4.5:1 (or 3:1 large text / graphics)."""
import sys

def oklch_to_srgb(L, C, H):
    # Bjorn Ottosson OKLab -> sRGB
    import math
    h = math.radians(H)
    a = C * math.cos(h)
    b = C * math.sin(h)
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l = l_ ** 3; m = m_ ** 3; s = s_ ** 3
    r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    def enc(c):
        if c <= 0.0031308: return 12.92 * c
        return 1.055 * (c ** (1 / 2.4)) - 0.055
    return tuple(min(1, max(0, enc(c))) for c in (r, g, bb))

def hex2rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))

def lum(rgb):
    def f(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (f(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def ratio(fg, bg):
    l1, l2 = sorted((lum(fg), lum(bg)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)

def rgbhex(rgb):
    return '#' + ''.join(f'{round(c*255):02x}' for c in rgb)

# ── Phase 7 token candidates (Direction C) ──
T = {
    'canvas':       oklch_to_srgb(0.979, 0.007, 88.6),
    'surface':      oklch_to_srgb(0.948, 0.013, 82.4),
    'surface-deep': oklch_to_srgb(0.909, 0.021, 81.8),
    'hairline':     oklch_to_srgb(0.866, 0.018, 81.3),
    'ink':          oklch_to_srgb(0.211, 0.005, 67.6),
    'body-text':    oklch_to_srgb(0.350, 0.009, 80.7),
    'muted-text':   oklch_to_srgb(0.470, 0.012, 80.0),
    'forest-700':   oklch_to_srgb(0.348, 0.055, 163),
    'forest-600':   oklch_to_srgb(0.380, 0.070, 152),
    'forest-500':   oklch_to_srgb(0.600, 0.100, 150),
    'abyss-950':    oklch_to_srgb(0.145, 0.025, 160),
    'abyss-900':    oklch_to_srgb(0.190, 0.035, 158),
    'abyss-800':    oklch_to_srgb(0.240, 0.045, 156),
    'paper-on-dark':oklch_to_srgb(0.955, 0.008, 90),
    'mist-on-dark': oklch_to_srgb(0.800, 0.010, 140),
    'gold-300':     oklch_to_srgb(0.800, 0.130, 85),
    'gold-glow':    oklch_to_srgb(0.780, 0.140, 85),
    'gold-500':     oklch_to_srgb(0.720, 0.140, 83),
    'gold-600':     oklch_to_srgb(0.550, 0.120, 78),
    'gold-700':     oklch_to_srgb(0.470, 0.105, 75),
    'white':        hex2rgb('ffffff'),
}

print('== token hex round-trip ==')
for k, v in T.items():
    if k != 'white': print(f'{k:15s} {rgbhex(v)}')

pairs = [
    # (fg, bg, label, need)  need: 4.5 body / 3.0 large-or-graphics
    ('ink', 'canvas', 'H-headline ink on canvas', 4.5),
    ('ink', 'surface', 'headline ink on surface', 4.5),
    ('body-text', 'canvas', 'body on canvas', 4.5),
    ('body-text', 'surface', 'body on surface', 4.5),
    ('muted-text', 'canvas', 'muted labels on canvas', 4.5),
    ('muted-text', 'surface', 'muted labels on surface', 4.5),
    ('muted-text', 'surface-deep', 'muted labels on surface-deep', 4.5),
    ('forest-700', 'canvas', 'brand green text on canvas', 4.5),
    ('forest-600', 'canvas', 'green hover text on canvas', 4.5),
    ('white', 'forest-700', 'button label on green', 4.5),
    ('canvas', 'forest-700', 'canvas label on green btn', 4.5),
    ('white', 'forest-600', 'button label on green hover', 4.5),
    ('gold-600', 'canvas', 'GOLD TEXT gold-600 on canvas [THE FIX]', 4.5),
    ('gold-700', 'surface', 'gold-700 text on surface', 4.5),
    ('gold-700', 'canvas', 'gold-700 text on canvas', 4.5),
    ('gold-700', 'surface', 'gold-700 text on surface', 4.5),
    ('gold-glow', 'abyss-900', 'gold-glow accents on abyss-900', 4.5),
    ('gold-glow', 'abyss-800', 'gold-glow on abyss-800 panels', 4.5),
    ('gold-500', 'abyss-900', 'gold-500 on abyss-900', 4.5),
    ('gold-300', 'abyss-900', 'gold-300 decorative on abyss-900', 4.5),
    ('gold-glow', 'abyss-950', 'gold-glow on abyss-950 vignette', 4.5),
    ('paper-on-dark', 'abyss-900', 'headline on abyss-900', 4.5),
    ('paper-on-dark', 'abyss-800', 'headline on abyss-800', 4.5),
    ('mist-on-dark', 'abyss-900', 'body on abyss-900', 4.5),
    ('mist-on-dark', 'abyss-800', 'body on abyss-800', 4.5),
    ('canvas', 'abyss-900', 'legacy text-canvas on abyss-900', 4.5),
    ('forest-500', 'abyss-900', 'forest-500 lines on abyss-900', 3.0),
    ('gold-500', 'abyss-900', 'gold-500 SVG links on abyss-900', 3.0),
    ('hairline', 'abyss-900', 'hairline borders on abyss-900', 3.0),
]

fails = 0
print('\n== contrast ledger ==')
for fg, bg, label, need in pairs:
    r = ratio(T[fg], T[bg])
    ok = 'PASS' if r >= need else 'FAIL'
    if r < need: fails += 1
    grade = 'AAA' if r >= 7 else ('AA' if r >= 4.5 else ('AA-large' if r >= 3 else '-'))
    print(f'{ok}  {r:5.2f}:1  {grade:8s} {label}')

# old gold bug reference
print(f"\nreference: legacy #b8860b on #faf8f3 = {ratio(hex2rgb('b8860b'), T['canvas']):.2f}:1 (the bug)")
print(f"reference: legacy --color-muted #E8E0D2 on #faf8f3 = {ratio(T['surface-deep'], T['canvas']):.2f}:1 (the dup-token bug)")
sys.exit(1 if fails else 0)
