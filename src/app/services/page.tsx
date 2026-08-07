import { Section } from "@/components/layout/section";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services — LeTrainAI",
  description:
    "AI automation, AI-enhanced websites, AI consulting, and workflow automation designed to deliver measurable ROI within 90 days.",
};

interface ServiceEntry {
  number: string;
  title: string;
  description: string;
  includes: string[];
  example: string;
  /** Which side the number/title sits on for structural variety */
  bias: "left" | "right";
}

const services: ServiceEntry[] = [
  {
    number: "01",
    title: "AI Automation",
    description:
      "Eliminate the repetitive tasks eating your team's day. We identify the manual processes draining your hours and replace them with reliable, AI-powered automations that run around the clock without complaint.",
    includes: [
      "Process automation",
      "Document processing",
      "Data extraction",
      "Report generation",
    ],
    example: "Reduce manual processing time by up to 67%",
    bias: "left",
  },
  {
    number: "02",
    title: "AI-Enhanced Websites",
    description:
      "Websites that don't just sit there — they capture leads, answer questions, and book appointments. We rebuild your digital front door so it works for you 24/7, turning visitors into booked calls without a human in the loop.",
    includes: [
      "Assessment tools",
      "AI chat",
      "Smart forms",
      "Auto-scheduling",
      "SEO optimization",
    ],
    example: "Turn your website from a brochure into your best salesperson",
    bias: "right",
  },
  {
    number: "03",
    title: "AI Consulting",
    description:
      "Know exactly what AI can do for your business — without the enterprise price tag. We cut through the hype and show you the 2–3 highest-impact opportunities for your specific operation, grounded in real numbers.",
    includes: [
      "Strategy sessions",
      "Opportunity audits",
      "Implementation roadmaps",
      "Team training",
    ],
    example:
      "Get a prioritized 90-day implementation plan tailored to your business",
    bias: "left",
  },
  {
    number: "04",
    title: "Workflow Automation",
    description:
      "Connect your tools so data flows automatically. No more copy-pasting between spreadsheets, CRMs, and inboxes. We wire your stack together so a single event triggers the entire downstream chain — reliably and observably.",
    includes: [
      "n8n / Make integrations",
      "API connections",
      "Custom pipelines",
      "Error monitoring",
    ],
    example:
      "Eliminate the 5+ hours/week your team spends on manual data transfer",
    bias: "right",
  },
];

export default function ServicesPage() {
  return (
    <main className="bg-canvas text-body">
      {/* Header */}
      <Section maxWidth="narrow" className="pb-12 sm:pb-16 pt-24 sm:pt-32">
        <div className="border-b border-hairline pb-12">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-6">
            Services
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl text-ink leading-[1.05]">
            4 Ways We Put AI to Work for Your Business
          </h1>
          <p className="mt-6 text-lg text-muted max-w-xl">
            Each service is designed to deliver measurable ROI within 90 days.
          </p>
        </div>
      </Section>

      {/* Service entries — vertical editorial, alternating bias */}
      {services.map((service, idx) => (
        <ServiceBlock key={service.number} service={service} last={idx === services.length - 1} />
      ))}

      {/* CTA */}
      <section className="bg-surface border-t border-hairline">
        <Section maxWidth="narrow" className="py-20 sm:py-28">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-5">
              Get started
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-ink leading-[1.1] max-w-2xl mx-auto">
              Not sure which service fits? Start with a free AI assessment.
            </h2>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-sans text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Start my assessment
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/contact"
                className="font-sans text-sm text-accent underline-offset-4 hover:underline transition-colors"
              >
                Or book a strategy call →
              </Link>
            </div>
          </div>
        </Section>
      </section>
    </main>
  );
}

function ServiceBlock({ service, last }: { service: ServiceEntry; last: boolean }) {
  const numberOnLeft = service.bias === "left";

  return (
    <Section maxWidth="default" className={last ? "border-b border-hairline" : ""}>
      <div className="border-b border-hairline pb-16 sm:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-start">
          {/* Left column — number + title (or description on alternate) */}
          {numberOnLeft ? (
            <>
              <div className="lg:col-span-5">
                <span className="font-mono text-6xl text-muted/30 leading-none block mb-5">
                  {service.number}
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-ink leading-[1.1]">
                  {service.title}
                </h2>
              </div>
              <div className="lg:col-span-7 lg:pt-16">
                <ServiceDetail service={service} />
              </div>
            </>
          ) : (
            <>
              <div className="lg:col-span-7 order-2 lg:order-1 lg:pt-16">
                <ServiceDetail service={service} />
              </div>
              <div className="lg:col-span-5 order-1 lg:order-2 lg:text-right">
                <span className="font-mono text-6xl text-muted/30 leading-none block mb-5">
                  {service.number}
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-ink leading-[1.1]">
                  {service.title}
                </h2>
              </div>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

function ServiceDetail({ service }: { service: ServiceEntry }) {
  return (
    <div>
      <p className="text-lg text-body leading-relaxed mb-8">
        {service.description}
      </p>

      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-4">
          What we do
        </p>
        <ul className="space-y-2.5">
          {service.includes.map((item) => (
            <li
              key={item}
              className="flex items-baseline gap-3 text-body"
            >
              <span className="font-mono text-accent text-sm shrink-0">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-l-2 border-accent pl-4 mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-1.5">
          Example outcome
        </p>
        <p className="font-serif text-lg text-ink leading-snug">
          {service.example}
        </p>
      </div>

      <Link
        href="/contact"
        className="font-sans text-sm text-accent underline-offset-4 hover:underline transition-colors"
      >
        Discuss this service →
      </Link>
    </div>
  );
}
