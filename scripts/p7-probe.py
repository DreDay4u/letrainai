"""Probe scrollytelling DOM state at act-3 scroll position."""
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3105"
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    pg = ctx.new_page()
    pg.goto(BASE + "/", wait_until="networkidle")
    pg.evaluate("document.getElementById('workflow-story').scrollIntoView()")
    pg.wait_for_timeout(700)
    info = pg.evaluate("""() => {
      const root = document.getElementById('workflow-story');
      const runway = root.offsetHeight;
      const top = root.getBoundingClientRect().top + window.scrollY;
      return { runway, top };
    }""")
    pg.evaluate(f"window.scrollTo(0, {info['top'] + info['runway'] * 0.88})")
    pg.wait_for_timeout(1500)
    state = pg.evaluate("""() => {
      const live = document.querySelector('.ws-live');
      const flow = document.querySelector('[data-act="flow"]');
      const stats = document.querySelector('.ws-live .ws-stats');
      const nums = [...document.querySelectorAll('.ws-live .ws-num')].map(n => n.textContent);
      const cs = flow ? getComputedStyle(flow) : null;
      return {
        liveDisplay: live ? getComputedStyle(live).display : null,
        flowOpacity: cs ? cs.opacity : null,
        flowTransform: cs ? cs.transform : null,
        statsExists: !!stats,
        statsDisplay: stats ? getComputedStyle(stats).display : null,
        statsText: nums,
        flowRect: flow ? flow.getBoundingClientRect() : null,
        statsRect: stats ? stats.getBoundingClientRect() : null,
      };
    }""")
    for k, v in state.items():
        print(k, "=", v)
    # viewport-only shot of the pinned stage
    pg.screenshot(path="/home/andre/letrainai-p7/migration-notes/screenshots/p7/scrollytelling-act3-viewport.png")
    b.close()
print("PROBE DONE")
