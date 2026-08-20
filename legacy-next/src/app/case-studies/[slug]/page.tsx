import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { getAllCaseStudies, getCaseStudy } from "@/lib/content";
import { marked } from "marked";

export async function generateStaticParams() {
  const studies = await getAllCaseStudies();
  return studies.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = await getCaseStudy(slug);
  if (!study) return {};
  return {
    title: study.title,
    description: study.challenge,
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = await getCaseStudy(slug);
  if (!study) notFound();

  const html = marked.parse(study.content, { async: false }) as string;

  return (
    <main>
      <Section maxWidth="narrow">
        <Link
          href="/case-studies"
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          ← Back to case studies
        </Link>

        <article className="mt-8">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-surface px-3 py-1 font-mono text-muted">
              {study.industry}
            </span>
            <span className="rounded-full bg-surface px-3 py-1 font-mono text-muted">
              {study.companySize}
            </span>
          </div>

          <h1 className="mt-4 font-serif font-normal text-3xl tracking-tight text-ink sm:text-4xl">
            {study.title}
          </h1>

          {study.isIllustrative && (
            <p className="mt-4 border-l-2 border-muted pl-4 text-sm italic text-muted">
              Illustrative case study — modeled on common SMB scenarios. Not a
              specific client engagement.
            </p>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-hairline p-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted">
                Challenge
              </h3>
              <p className="mt-1 text-body">{study.challenge}</p>
            </div>
            <div className="rounded-lg border border-hairline p-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted">
                Result
              </h3>
              <p className="mt-1 text-body">{study.result}</p>
            </div>
          </div>

          <div
            className="mt-10 max-w-none [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:text-ink [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-body [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic"
            dangerouslySetInnerHTML={{ __html: html }}
          />

        </article>

        <div className="mt-16 border-t border-hairline pt-8">
          <Link
            href="/assessment"
            className="inline-flex items-center gap-1.5 text-base font-medium text-accent transition-colors hover:text-accent-hover"
          >
            See what AI can do for your business? Start your free assessment →
          </Link>
        </div>
      </Section>
    </main>
  );
}
