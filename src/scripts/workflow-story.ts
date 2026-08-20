// workflow-story.ts — the ONE GSAP-driven section (lazy chunk).
// Loaded only when: section approaching viewport + desktop + fine pointer +
// motion allowed (see WorkflowStory.astro loader). Everyone else pays 0 bytes.
//
// Structure follows the researched pattern (gsap-patterns.md):
//   CSS sticky owns the pin; ScrollTrigger only scrubs the timeline.
//   One timeline, scrub 0.8 (weighty register, not mechanical).
//   Counters fire once on enter, unscrubbed (Stripe pattern).
//   transform/opacity/dashoffset only — no layout properties.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

export function init(root: HTMLElement): () => void {
  const mm = gsap.matchMedia();

  mm.add(
    { full: '(prefers-reduced-motion: no-preference) and (min-width: 48rem)' },
    (ctx) => {
      if (!ctx.conditions?.full) return;

      const q = gsap.utils.selector(root);
      const svg = root.querySelector<SVGSVGElement>('.ws-visual svg');
      if (!svg) return;

      // Pre-state for the live instance (mirrors CSS defaults; belt + braces
      // in case a slow chunk lands after a fast scroll).
      gsap.set(q('.wsd-link'), { drawSVG: '0%' });
      gsap.set(q('.ws-caption'), { opacity: 0, y: 24 });

      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.8,
          // no pin — CSS position: sticky owns it
        },
      });

      // ── ACT 1 · manual / disconnected (0 → ~30%) ──
      tl.from(q('.wsd-manual .wsd-node'), {
        opacity: 0.35,
        scale: 0.9,
        transformOrigin: 'center',
        stagger: { each: 0.04, from: 'random' },
        duration: 0.5,
      })
        .to(q('[data-act="manual"]'), { opacity: 1, y: 0, duration: 0.4 }, '<0.1')
        .to(q('[data-act="manual"]'), { opacity: 0, y: -24, duration: 0.3 }, '+=0.25');

      // ── ACT 2 · staged connections (~30 → 62%) ──
      tl.addLabel('act2')
        .to(q('.wsd-manual'), { opacity: 0.12, duration: 0.4 }, 'act2')
        .to(q('.wsd-ai'), { opacity: 1, duration: 0.5 }, 'act2+=0.2')
        .to(
          q('.wsd-link'),
          { drawSVG: '100%', stagger: 0.12, duration: 0.8, ease: 'power1.inOut' },
          'act2+=0.35'
        )
        .to(q('[data-act="connect"]'), { opacity: 1, y: 0, duration: 0.4 }, 'act2+=0.5')
        .to(q('[data-act="connect"]'), { opacity: 0, y: -24, duration: 0.3 }, '+=0.25');

      // ── ACT 3 · coordinated flow (~62 → 100%) ──
      tl.addLabel('act3')
        // deepen the world as the system comes online (Direction C note:
        // B's deeper abyss reserved for the final act)
        .to(q('.ws-deepen'), { opacity: 0.55, duration: 1.2, ease: 'sine.inOut' }, 'act3')
        .to(q('.wsd-halo'), { opacity: 0.55, scale: 1.05, transformOrigin: 'center', duration: 1.1, ease: 'sine.inOut' }, 'act3')
        // marching dashes = data flowing along the wired paths
        .to(
          q('.wsd-link'),
          { strokeDasharray: '5 23', strokeDashoffset: '-=46', duration: 0.6, ease: 'none', repeat: 2 },
          'act3+=0.3'
        )
        .to(q('[data-act="flow"]'), { opacity: 1, y: 0, duration: 0.5 }, 'act3+=0.4');

      // Counters: reward the read, fire once, never scrubbed
      root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
        const end = Number(el.dataset.count);
        const prefix = el.dataset.prefix ?? '';
        const suffix = el.dataset.suffix ?? '';
        const obj = { v: 0 };
        gsap.to(obj, {
          v: end,
          duration: 1.4,
          ease: 'power1.out',
          scrollTrigger: { trigger: root, start: '75% bottom', once: true },
          onUpdate: () => {
            el.textContent = prefix + Math.round(obj.v).toLocaleString('en-US') + suffix;
          },
        });
      });
    }
  );

  // Full cleanup: kills triggers, reverts inline styles (half-scrolled
  // elements never survive), releases matchMedia handlers.
  return () => mm.revert();
}
