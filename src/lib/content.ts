import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";
import path from "path";

const reader = createReader(path.join(process.cwd()), keystaticConfig);

export type Post = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  content: unknown;
};

export type CaseStudy = {
  slug: string;
  title: string;
  industry: string;
  companySize: string;
  challenge: string;
  result: string;
  isIllustrative: boolean;
  content: any;
};

export async function getAllPosts(): Promise<Post[]> {
  const posts = await reader.collections.posts.all();
  return posts
    .map((p) => ({
      slug: p.slug,
      title: p.entry.title,
      description: p.entry.description,
      publishedAt: p.entry.publishedAt ?? "",
      content: p.entry.content,
    }))
    .filter((p) => p.publishedAt !== "")
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
}

export async function getPost(slug: string): Promise<Post | null> {
  const post = await reader.collections.posts.read(slug);
  if (!post) return null;
  return {
    slug,
    title: post.title,
    description: post.description,
    publishedAt: post.publishedAt ?? "",
    content: post.content,
  };
}

export async function getAllCaseStudies(): Promise<CaseStudy[]> {
  const studies = await reader.collections.caseStudies.all();
  return studies.map((s) => ({
    slug: s.slug,
    title: s.entry.title,
    industry: s.entry.industry,
    companySize: s.entry.companySize,
    challenge: s.entry.challenge,
    result: s.entry.result,
    isIllustrative: s.entry.isIllustrative ?? true,
    content: s.entry.content,
  }));
}

export async function getCaseStudy(slug: string): Promise<CaseStudy | null> {
  const study = await reader.collections.caseStudies.read(slug);
  if (!study) return null;
  return {
    slug,
    title: study.title,
    industry: study.industry,
    companySize: study.companySize,
    challenge: study.challenge,
    result: study.result,
    isIllustrative: study.isIllustrative ?? true,
    content: study.content,
  };
}
