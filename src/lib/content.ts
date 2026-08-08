import fs from "fs";
import path from "path";

/**
 * Direct content reader for MDX files with YAML frontmatter.
 * Reads blog posts and case studies from src/content/ without depending on
 * the Keystatic document format parser.
 */

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const yaml = match[1];
  const body = match[2];
  const data: Record<string, string> = {};

  // Simple YAML key-value parser (handles quoted values, escaped quotes)
  const lines = yaml.split("\n");
  for (const line of lines) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    // Remove surrounding quotes (single or double), handling '' as escaped '
    if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1).replace(/''/g, "'");
    } else if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1).replace(/\\"/g, '"');
    }
    data[m[1]] = val;
  }

  return { data, body };
}

function readContentFiles(dir: string): { slug: string; data: Record<string, string>; body: string }[] {
  const dirPath = path.join(CONTENT_DIR, dir);
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));
  return files.map((file) => {
    const slug = file.replace(/\.mdx?$/, "");
    const raw = fs.readFileSync(path.join(dirPath, file), "utf-8");
    const { data, body } = parseFrontmatter(raw);
    return { slug, data, body };
  });
}

export type Post = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  content: string;
};

export type CaseStudy = {
  slug: string;
  title: string;
  industry: string;
  companySize: string;
  challenge: string;
  result: string;
  isIllustrative: boolean;
  content: string;
};

export async function getAllPosts(): Promise<Post[]> {
  return readContentFiles("posts")
    .map((f) => ({
      slug: f.slug,
      title: f.data.title ?? f.slug,
      description: f.data.description ?? "",
      publishedAt: f.data.publishedAt ?? "",
      content: f.body,
    }))
    .filter((p) => p.publishedAt !== "")
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function getPost(slug: string): Promise<Post | null> {
  const posts = await getAllPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

export async function getAllCaseStudies(): Promise<CaseStudy[]> {
  return readContentFiles("case-studies").map((f) => ({
    slug: f.slug,
    title: f.data.title ?? f.slug,
    industry: f.data.industry ?? "",
    companySize: f.data.companySize ?? "",
    challenge: f.data.challenge ?? "",
    result: f.data.result ?? "",
    isIllustrative: f.data.isIllustrative !== "false",
    content: f.body,
  }));
}

export async function getCaseStudy(slug: string): Promise<CaseStudy | null> {
  const studies = await getAllCaseStudies();
  return studies.find((s) => s.slug === slug) ?? null;
}
