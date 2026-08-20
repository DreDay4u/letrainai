import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/layout/section";

const problems = [
  "Manual data entry that AI completes in seconds",
  "Customer questions answered by a bot that never sleeps",
  "Reports generated automatically — no more late nights in Excel",
];

const services = [
  {
    num: "01",
    title: "AI Automation",
    desc: "Eliminate repetitive tasks eating your team's day.",
  },
  {
    num: "02",
    title: "AI-Enhanced Websites",
    desc: "Sites that capture leads, answer questions, book appointments.",
  },
  {
    num: "03",
    title: "AI Consulting",
    desc: "Strategy without the enterprise price tag.",
  },
  {
    num: "04",
    title: "Workflow Automation",
    desc: "Connect your tools so data flows automatically.",
  },
];

export default function Home() {
  return (
    <main>
      {/* ── Hero — left-biased, content-height ── */}
      <Section>
        <div className="max-w-2xl">
          <h1 className="font-serif font-normal text-4xl sm:text-5xl lg:text-6xl tracking-tight text-ink">
            Stop losing $47,000/year to tasks your competitors already
            automated.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-body">
            LeTrainAI builds custom AI systems that handle your repetitive work —
            so your team focuses on growth, not busywork.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/assessment"
              className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-medium text-canvas transition-colors hover:bg-accent-hover"
            >
              Start my free AI assessment
            </Link>
            <Link
              href="/process"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              See how it works
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* ── Problem (PAS — Problem) ── */}
      <Section className="bg-surface" maxWidth="narrow">
        <h2 className="font-serif font-normal text-2xl tracking-tight text-ink sm:text-3xl">
          Most businesses waste 15+ hours every week on work AI should be doing.
        </h2>
        <ul className="mt-10 space-y-6">
          {problems.map((p) => (
            <li
              key={p}
              className="border-l-2 border-accent pl-4 text-lg text-body"
            >
              {p}
            </li>
          ))}
        </ul>
      </Section>

      {/* ── Solution ── */}
      <Section maxWidth="narrow">
        <h2 className="font-serif font-normal text-2xl tracking-tight text-ink sm:text-3xl">
          We build the AI systems that do that work for you.
        </h2>
        <div className="mt-10 border-t border-hairline">
          {services.map((s) => (
            <Link
              key={s.num}
              href="/services"
              className="group flex gap-4 border-b border-l-2 border-transparent border-hairline py-6 pl-4 transition-colors hover:border-l-accent sm:gap-6"
            >
              <span className="font-mono text-sm text-muted">{s.num}</span>
              <div>
                <h3 className="font-serif text-xl text-ink transition-colors group-hover:text-accent">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-body">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* ── Proof — genuine scarcity ── */}
      <Section className="bg-dark-surface" maxWidth="narrow">
        <h2 className="font-serif font-normal text-2xl tracking-tight text-canvas sm:text-3xl">
          Be among our first 10 clients.
        </h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-hairline">
          Founding clients receive priority implementation and founding-partner
          pricing.
        </p>
      </Section>

      {/* ── Assessment CTA Band ── */}
      <Section className="bg-surface">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-lg font-serif font-normal text-2xl tracking-tight text-ink sm:text-3xl">
            See your AI opportunity in 3 minutes.
          </h2>
          <Link
            href="/assessment"
            className="inline-flex shrink-0 items-center gap-1.5 text-base font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Start my free assessment
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </Section>

      {/* Blog preview — placeholder; add posts when available */}
    </main>
  );
}
