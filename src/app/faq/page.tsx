"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Section } from "@/components/layout/section";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqGroup {
  title: string;
  items: FaqItem[];
}

const faqGroups: FaqGroup[] = [
  {
    title: "What AI Can Actually Do",
    items: [
      {
        q: "Can AI really handle my customer service?",
        a: "Yes. Modern AI handles up to 80% of routine customer questions instantly — orders, FAQs, scheduling, status updates. The remaining 20% route to your team. This isn't chatbots from 5 years ago; today's systems understand context and nuance.",
      },
      {
        q: "What tasks should I automate first?",
        a: "Start with tasks that are repetitive, rule-based, and eat significant time: data entry, report generation, customer intake, appointment scheduling. These deliver measurable ROI fastest — often within the first 30 days.",
      },
      {
        q: "How much does AI implementation cost?",
        a: "Less than you think. Most SMB implementations pay for themselves within 60-90 days through time savings alone. We structure pricing around your ROI, not a flat software fee. Start with a free assessment to see your specific savings potential.",
      },
      {
        q: "Do I need technical staff to use AI?",
        a: "No. We build systems your existing team can use with minimal training. If you can use email and a web browser, you can use the AI tools we deploy.",
      },
    ],
  },
  {
    title: "Is It Safe?",
    items: [
      {
        q: "What happens to my data?",
        a: "Your data stays yours. We never sell, share, or use your business data to train public models. All AI systems run on your own infrastructure or encrypted private cloud with access controls you own.",
      },
      {
        q: "Can AI make mistakes that hurt my business?",
        a: "AI is a tool, not a replacement for judgment. We design systems with human-in-the-loop checkpoints for any decision that carries real risk. The AI handles the repetitive 80%; your team approves anything that matters.",
      },
      {
        q: "Is my business too small for AI?",
        a: "If you have 5+ employees and repetitive tasks, AI can help. Some of the highest-ROI implementations we've seen are in businesses with 10-30 employees — small enough to be agile, big enough to have real inefficiencies.",
      },
      {
        q: "Will AI replace my employees?",
        a: "No. AI handles tasks, not jobs. It eliminates the boring parts of work so your people can focus on what humans do best: relationships, creativity, judgment, and strategy. Teams that adopt AI well become more valuable, not less.",
      },
    ],
  },
  {
    title: "Working with LeTrainAI",
    items: [
      {
        q: "How long does implementation take?",
        a: "Most projects go live in 2-8 weeks, depending on scope. You'll see working prototypes within the first week — we build in iterations, not slide decks.",
      },
      {
        q: "What if I don't know what I need?",
        a: "That's exactly what our free AI assessment is for. It takes 3 minutes and shows you exactly where AI can save you time and money — no technical knowledge required.",
      },
      {
        q: "Do you work with businesses outside the US?",
        a: "Currently, we focus on US-based businesses. As our infrastructure expands, we'll open up to international clients.",
      },
      {
        q: "What does ongoing support look like?",
        a: "Every implementation includes 30 days of post-launch support. After that, we offer monthly retainer options for optimization, monitoring, and expanding your AI capabilities over time.",
      },
    ],
  },
];

export default function FaqPage() {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpenItem((prev) => (prev === key ? null : key));
  };

  return (
    <>
      {/* ── Header ── */}
      <Section maxWidth="narrow" className="pb-8">
        <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">
          What You Actually Need to Know About AI for Your Business
        </h1>
        <p className="mt-6 text-lg text-muted leading-relaxed">
          No hype. No jargon. Straight answers.
        </p>
      </Section>

      {/* ── FAQ accordion groups ── */}
      <Section maxWidth="narrow" className="border-t border-hairline pt-12">
        <div className="space-y-16">
          {faqGroups.map((group, gi) => (
            <div key={gi}>
              <h2 className="font-serif text-xl text-muted mb-6">
                {group.title}
              </h2>
              <div className="border-t border-hairline">
                {group.items.map((item, ii) => {
                  const itemKey = `${gi}-${ii}`;
                  const isOpen = openItem === itemKey;
                  return (
                    <div
                      key={itemKey}
                      className="border-b border-hairline"
                    >
                      <button
                        type="button"
                        onClick={() => toggle(itemKey)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 py-5 text-left"
                      >
                        <span className="font-medium text-ink text-lg">
                          {item.q}
                        </span>
                        <ChevronDown
                          className={`shrink-0 h-5 w-5 text-muted transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      <div
                        className={`grid transition-all duration-200 ease-in-out ${
                          isOpen
                            ? "grid-rows-[1fr] opacity-100 pb-5"
                            : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <p className="text-body leading-relaxed pr-8">
                            {item.a}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── CTA ── */}
      <Section maxWidth="narrow" className="bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <p className="font-serif text-2xl text-ink leading-snug">
            Still have questions? Start with a free AI assessment.
          </p>
          <a
            href="/assessment"
            className="inline-flex items-center whitespace-nowrap text-accent font-medium text-lg hover:underline shrink-0"
          >
            Start my assessment →
          </a>
        </div>
      </Section>
    </>
  );
}
