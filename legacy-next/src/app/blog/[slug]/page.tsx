import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { getAllPosts, getPost } from "@/lib/content";
import { marked } from "marked";

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const html = marked.parse(post.content, { async: false }) as string;

  return (
    <main>
      <Section maxWidth="narrow">
        <Link
          href="/blog"
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          ← Back to blog
        </Link>

        <article className="mt-8">
          <time
            dateTime={post.publishedAt}
            className="font-mono text-xs text-muted"
          >
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <h1 className="mt-2 font-serif font-normal text-3xl tracking-tight text-ink sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-body">{post.description}</p>

          <div
            className="mt-10 max-w-none [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:text-ink [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-body [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-accent [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: html }}
          />

        </article>

        <div className="mt-16 border-t border-hairline pt-8">
          <Link
            href="/assessment"
            className="inline-flex items-center gap-1.5 text-base font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Ready to see your AI opportunity? Start your free assessment →
          </Link>
        </div>
      </Section>
    </main>
  );
}
