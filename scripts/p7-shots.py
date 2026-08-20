"""Phase 7 visual gates — Playwright screenshots on 127.0.0.1:3105."""
import os
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3105"
OUT = "/home/andre/letrainai-p7/migration-notes/screenshots/p7"
os.makedirs(OUT, exist_ok=True)

DESKTOP = {"width": 1440, "height": 900}
MOBILE = {"width": 390, "height": 844}

def shot(page, path):
    page.screenshot(path=path, full_page=True)
    print("saved", path, os.path.getsize(path) // 1024, "KB")

with sync_playwright() as p:
    browser = p.chromium.launch()

    # 1. Homepage desktop full-page
    ctx = browser.new_context(viewport=DESKTOP, device_scale_factor=1)
    pg = ctx.new_page()
    pg.goto(BASE + "/", wait_until="networkidle")
    pg.wait_for_timeout(600)
    shot(pg, f"{OUT}/home-desktop-full.png")

    # 2. Homepage mobile full-page (static 3-panel expected)
    ctx2 = browser.new_context(viewport=MOBILE, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg2 = ctx2.new_page()
    pg2.goto(BASE + "/", wait_until="networkidle")
    pg2.wait_for_timeout(400)
    shot(pg2, f"{OUT}/home-mobile-full.png")

    # 3. Scrollytelling mid-scroll desktop: scroll into pinned act 2
    pg.evaluate("document.getElementById('workflow-story').scrollIntoView()")
    pg.wait_for_timeout(700)  # allow IO -> dynamic import -> timeline build
    win_h = pg.evaluate("window.innerHeight")
    # scroll 55% through the 400svh runway => act 2 (connections drawing)
    runway = pg.evaluate("document.getElementById('workflow-story').offsetHeight")
    top = pg.evaluate("document.getElementById('workflow-story').getBoundingClientRect().top + window.scrollY")
    pg.evaluate(f"window.scrollTo(0, {top + runway * 0.42})")
    pg.wait_for_timeout(1200)
    shot(pg, f"{OUT}/scrollytelling-mid-act2.png")

    # 4. Act 3 state (deepened, marching dashes visible)
    pg.evaluate(f"window.scrollTo(0, {top + runway * 0.88})")
    pg.wait_for_timeout(1400)
    shot(pg, f"{OUT}/scrollytelling-act3.png")

    # verify GSAP chunk actually loaded on desktop
    loaded = pg.evaluate("performance.getEntriesByType('resource').map(r => r.name).filter(n => n.includes('workflow-story')).length")
    print("workflow-story chunk loaded on desktop:", loaded)

    ctx.close()

    # 5. Reduced-motion emulation desktop
    ctx3 = browser.new_context(viewport=DESKTOP, reduced_motion="reduce")
    pg3 = ctx3.new_page()
    pg3.goto(BASE + "/", wait_until="networkidle")
    pg3.wait_for_timeout(400)
    shot(pg3, f"{OUT}/home-reduced-motion-full.png")
    loaded3 = pg3.evaluate("performance.getEntriesByType('resource').map(r => r.name).filter(n => n.includes('workflow-story')).length")
    print("workflow-story chunk loaded under reduced motion:", loaded3, "(expect 0)")
    ctx3.close()

    # 6. Interior pages desktop (spot-check layout)
    for slug, name in [("/services", "services"), ("/case-studies", "case-studies"), ("/about", "about")]:
        c = browser.new_context(viewport=DESKTOP)
        g = c.new_page()
        g.goto(BASE + slug, wait_until="networkidle")
        g.wait_for_timeout(300)
        shot(g, f"{OUT}/{name}-desktop.png")
        c.close()

    # mobile GSAP check
    loadedm = pg2.evaluate("performance.getEntriesByType('resource').map(r => r.name).filter(n => n.includes('workflow-story')).length")
    print("workflow-story chunk loaded on mobile:", loadedm, "(expect 0)")

    browser.close()
print("DONE")
