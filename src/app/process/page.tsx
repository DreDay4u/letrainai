import { Section } from "@/components/layout/section";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Process — LeTrainAI",
  description:
    "A proven 3-phase approach: Assess, Implement, Optimize. Working prototypes, zero downtime, and measurable results — without disrupting your business.",
};

interface Step {
  number: string;
  timeline: string;
  title: string;
  description: string;
  whatHappens: string[];
  anxietyReducer: string;
}

const steps: Step[] = [
  {
    number: "01",
    timeline: "Week 1",
    title: "We identify your highest-ROI AI opportunities",
    description:
      "We start with your actual workflows — not a generic checklist. A focused audit reveals exactly where AI will save the most time and money, so we invest your budget where it pays off first.",
    whatHappens: [
      "Deep-dive audit of your current workflows",
      "Interviews with your team about pain points",
      "Opportunity report with prioritized recommendations",
    ],
    anxietyReducer: "No changes to your systems yet.",
  },
  {
    number: "02",
    timeline: "Weeks 2-8",
    title: "We build and deploy alongside your team",
    description:
      "We build in short, visible iterations. You see working prototypes early, give feedback on everything, and approve every change before it goes live — deployed quietly, without skipping a beat.",
    whatHappens: [
      "Working prototypes within the first week",
      "Iterative development with your feedback",
      "Deployment with zero downtime",
      "Team training on the new systems",
    ],
    anxietyReducer: "Your team stays in full control throughout.",
  },
  {
    number: "03",
    timeline: "Ongoing",
    title: "Your AI gets smarter over time",
    description:
      "Deployment is the start, not the finish. We keep measuring performance, refining the models, and finding the next workflow worth automating — so the value compounds month after month.",
    whatHappens: [
      "Monthly performance reviews",
      "Continuous refinement of AI models",
      "Expansion into new workflows as needs grow",
    ],
    anxietyReducer: "We measure everything. You&apos;ll see the numbers.",
  },
];

const terminalLines: { text: string; dim?: boolean }[] = [
  { text: "# Example: Customer inquiry → AI response", dim: true },
  { text: "" },
  { text: "1. Customer emails support@yourbusiness.com" },
  { text: "2. AI classifies intent: [order-status | billing | product-question]" },
  { text: "3. AI drafts response with relevant order data" },
  { text: "4. Response sent in < 2 minutes (was: 4 hours)" },
  { text: "5. Complex issue? Escalated to your team" },
  { text: "   → 80% handled automatically", dim: true },
  { text: "   → 20% escalated with full context", dim: true },
];

export default function ProcessPage() {
  return (
    <main className="bg-canvas text-body">
      {/* ── Header ── */}
      <Section maxWidth="narrow" className="pb-12 sm:pb-16 pt-24 sm:pt-32">
        <div className="border-b border-hairline pb-12">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-6">
            Process
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl text-ink leading-[1.05]">
            How We Get Your AI Working — Without Disrupting Your Business
          </h1>
          <p className="mt-6 text-lg text-muted max-w-xl">
            A proven 3-phase approach. You&apos;ll see working prototypes, not
            slide decks.
          </p>
        </div>
      </Section>

      {/* ── 3-Step framework — vertical, numbered, editorial ── */}
      {steps.map((step) => (
        <StepBlock key={step.number} step={step} />
      ))}

      {/* ── Dark terminal section ── */}
      <Section className="bg-dark-surface">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-canvas/50 mb-5">
          Under the hood
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl text-canvas leading-[1.1]">
          A real workflow looks like this:
        </h2>

        <pre className="mt-10 overflow-x-auto rounded-lg border border-hairline/20 bg-ink/20 p-6 font-mono text-sm leading-relaxed text-canvas/90">
          <code>
            {terminalLines.map((line, idx) => (
              <span
                key={idx}
                className={
                  line.dim
                    ? "block whitespace-pre text-canvas/40"
                    : "block whitespace-pre"
                }
              >
                {line.text}
              </span>
            ))}
          </code>
        </pre>

        <p className="mt-6 text-sm text-canvas/50">
          Illustrative example. Your workflow will be tailored to your
          business.
        </p>
      </Section>

      {/* ── CTA — surface bg ── */}
      <section className="bg-surface border-t border-hairline">
        <Section maxWidth="narrow" className="py-20 sm:py-28">
          <div className="text-center">
            <h2 className="font-serif text-3xl sm:text-4xl text-ink leading-[1.1] max-w-2xl mx-auto">
              Ready to see what AI can do for your business?
            </h2>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-sans text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Start my free assessment
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/contact"
                className="font-sans text-sm text-accent underline-offset-4 hover:underline transition-colors"
              >
                Book a strategy call →
              </Link>
            </div>
          </div>
        </Section>
      </section>
    </main>
  );
}

function StepBlock({ step }: { step: Step }) {
  return (
    <Section maxWidth="default">
      <div className="border-b border-hairline pb-16 sm:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-start">
          {/* Left — number, title, timeline badge */}
          <div className="lg:col-span-5">
            <span className="font-mono text-6xl text-muted/30 leading-none block">
              {step.number}
            </span>
            <span className="mt-6 inline-flex items-center rounded-full border border-accent px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-accent">
              {step.timeline}
            </span>
            <h2 className="mt-5 font-serif text-3xl sm:text-4xl text-ink leading-[1.1]">
              {step.title}
            </h2>
          </div>

          {/* Right — description, what happens, anxiety reducer */}
          <div className="lg:col-span-7 lg:pt-10">
            <p className="text-lg text-body leading-relaxed mb-8">
              {step.description}
            </p>

            <div className="mb-8">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-4">
                What happens
              </p>
              <ul className="space-y-3">
                {step.whatHappens.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-body">
                    <Check className="mt-1 size-4 shrink-0 text-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-l-2 border-accent pl-4">
              <p className="font-serif text-lg italic text-muted leading-snug">
                {step.anxietyReducer}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
