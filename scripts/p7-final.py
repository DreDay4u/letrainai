"""Final visual gate: case-study detail (isIllustrative) + computed token colors."""
import json
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3105"
OUT = "/home/andre/letrainai-p7/migration-notes/screenshots/p7"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    pg = ctx.new_page()

    # case study detail — first slug
    pg.goto(BASE + "/case-studies", wait_until="networkidle")
    slug = pg.eval_on_selector("main a[href^='/case-studies/']", "el => el.getAttribute('href')")
    print("detail page:", slug)
    pg.goto(BASE + slug, wait_until="networkidle")
    pg.wait_for_timeout(300)
    label = pg.evaluate("""() => {
      const el = [...document.querySelectorAll('p')].find(p => p.textContent.includes('Illustrative'));
      return el ? { text: el.textContent.trim().slice(0, 90), color: getComputedStyle(el).color } : null;
    }""")
    print("illustrative label:", json.dumps(label))
    pg.screenshot(path=f"{OUT}/case-study-detail.png", full_page=True)

    # homepage: computed colors of key token consumers
    pg.goto(BASE + "/", wait_until="networkidle")
    colors = pg.evaluate("""() => {
      const pick = (sel, prop='color') => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : null; };
      return {
        h1: pick('h1'),
        body: pick('.text-body'),
        mutedNum: pick('.font-mono.text-muted'),
        accentBtn: pick('.bg-accent', 'backgroundColor'),
        wsHalo: pick('#workflow-story .wsd-halo', 'stroke'),
        wsLink: pick('#workflow-story .wsd-link', 'stroke'),
        wsGoldNum: pick('#workflow-story .ws-num'),
        abyss: pick('#workflow-story', 'backgroundColor'),
        paperOnDark: pick('#workflow-story h3'),
        mist: pick('#workflow-story .ws-caption p'),
      };
    }""")
    for k, v in colors.items():
        print(f"{k:12s} = {v}")

    # horizontal overflow check on 4 pages (layout-break gate)
    for path in ["/", "/services", "/case-studies", "/about", "/process"]:
        pg.goto(BASE + path, wait_until="networkidle")
        ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        print(f"overflow-x {path}: {ov}px")

    b.close()
print("FINAL GATE DONE")
