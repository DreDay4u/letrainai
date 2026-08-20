import { Section } from "@/components/layout/section";

const capabilities = [
  {
    label: "Custom AI agents",
    description: "Purpose-built for your workflows",
  },
  {
    label: "Workflow engines",
    description: "Automated multi-step processes",
  },
  {
    label: "Knowledge graphs",
    description: "Your business data, structured and queryable",
  },
  {
    label: "API integrations",
    description: "Connected to your existing tools",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* ── Hero — left-biased, editorial ── */}
      <Section maxWidth="default">
        <div className="flex flex-col gap-12 sm:flex-row sm:items-start">
          {/* Photo placeholder */}
          <div className="aspect-square w-full max-w-xs shrink-0 rounded-sm bg-surface border border-hairline" />

          {/* Name + value prop */}
          <div className="flex flex-col justify-center sm:pt-8">
            <h1 className="font-serif text-4xl text-ink sm:text-5xl">
              Andre LeTren
            </h1>
            <p className="mt-2 text-muted-foreground">Founder, LeTrainAI</p>
            <p className="mt-6 max-w-md text-lg text-body leading-relaxed">
              Making enterprise-grade AI accessible to businesses that can&apos;t
              afford a $500K consultant.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Story — narrow width for readability ── */}
      <Section maxWidth="narrow" className="border-t border-hairline">
        <div className="space-y-6">
          <p className="text-lg leading-relaxed text-body">
            I started LeTrainAI after watching small businesses get left behind
            by the AI revolution. While enterprise companies invested millions
            in AI infrastructure, the businesses that employ most Americans were
            stuck doing everything by hand.
          </p>
          <p className="text-lg leading-relaxed text-body">
            The problem isn&apos;t that AI is too expensive or too complex.
            It&apos;s that nobody has built the bridge between cutting-edge AI
            and the businesses that need it most.
          </p>
          <p className="text-lg leading-relaxed text-body">
            That&apos;s what LeTrainAI does. We don&apos;t sell software — we
            build systems that work while you sleep, so your team can focus on
            what humans do best.
          </p>
        </div>
      </Section>

      {/* ── Capabilities — DARK section, the "wow" moment ── */}
      <section className="bg-dark-surface px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-serif text-3xl text-canvas sm:text-4xl">
            This isn&apos;t ChatGPT with a wrapper.
          </h2>
          <p className="mt-4 text-canvas/70">
            LeTrainAI runs on real AI infrastructure:
          </p>

          <ul className="mt-10 space-y-8">
            {capabilities.map((cap) => (
              <li key={cap.label} className="flex flex-col gap-1 sm:flex-row sm:gap-8">
                <span className="font-mono text-sm text-canvas w-56 shrink-0">
                  {cap.label}
                </span>
                <span className="text-canvas/60 leading-relaxed">
                  {cap.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Trust + CTA — surface bg ── */}
      <Section maxWidth="default" className="bg-surface">
        <div className="grid gap-12 sm:grid-cols-2">
          {/* Left: facts */}
          <div className="space-y-3">
            <p className="text-body">
              Based in <span className="text-ink">[City, State]</span>
            </p>
            <p className="text-body">Available remotely across the US</p>
            <p className="text-body">
              <a
                href="mailto:andre@letrainai.com"
                className="text-accent hover:text-accent-hover underline underline-offset-4 decoration-hairline"
              >
                andre@letrainai.com
              </a>
            </p>
          </div>

          {/* Right: CTA */}
          <div className="flex items-center sm:justify-end">
            <a
              href="/contact"
              className="font-serif text-2xl text-ink hover:text-accent transition-colors"
            >
              Let&apos;s talk about your AI future →
            </a>
          </div>
        </div>
      </Section>
    </>
  );
}
