import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { getAllCaseStudies } from "@/lib/content";

export const metadata: Metadata = {
  title: "Case Studies — LeTrainAI",
  description:
    "Real-world examples of AI automation solving concrete business problems — measurable results, practical implementations.",
};

export default async function CaseStudiesPage() {
  const studies = await getAllCaseStudies();

  return (
    <main>
      <Section maxWidth="narrow">
        <h1 className="font-serif font-normal text-3xl tracking-tight text-ink sm:text-4xl">
          What AI looks like when it works.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-body">
          Concrete examples of AI automation solving real business problems.
          These are illustrative scenarios based on common SMB patterns.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {studies.map((study) => (
            <Link
              key={study.slug}
              href={`/case-studies/${study.slug}`}
              className="group block rounded-lg border border-hairline bg-surface p-6 transition-colors hover:border-accent"
            >
              <span className="font-mono text-xs text-muted">
                {study.industry} · {study.companySize}
              </span>
              <h2 className="mt-2 font-serif text-xl text-ink transition-colors group-hover:text-accent">
                {study.title}
              </h2>
              <p className="mt-2 text-sm text-body">{study.challenge}</p>
              <p className="mt-3 text-sm font-medium text-accent">
                {study.result}
              </p>
            </Link>
          ))}
        </div>
      </Section>
    </main>
  );
}
