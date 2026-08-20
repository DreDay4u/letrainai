import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@/components/layout/section";
import { getAllPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog — LeTrainAI",
  description:
    "Practical insights on AI automation, implementation strategy, and getting real ROI from AI in your business.",
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <main>
      <Section maxWidth="narrow">
        <h1 className="font-serif font-normal text-3xl tracking-tight text-ink sm:text-4xl">
          Ideas worth implementing.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-body">
          Practical perspectives on AI automation, strategy, and what actually
          works for small and mid-size businesses.
        </p>

        <div className="mt-12 border-t border-hairline">
          {posts.map((post) => (
            <article key={post.slug} className="border-b border-hairline py-8">
              <Link href={`/blog/${post.slug}`} className="group block">
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
                <h2 className="mt-2 font-serif text-xl text-ink transition-colors group-hover:text-accent sm:text-2xl">
                  {post.title}
                </h2>
                <p className="mt-2 text-body">{post.description}</p>
                <span className="mt-3 inline-block text-sm font-medium text-accent">
                  Read more →
                </span>
              </Link>
            </article>
          ))}
        </div>
      </Section>
    </main>
  );
}
