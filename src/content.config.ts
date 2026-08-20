import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Collections mirror the legacy Keystatic schemas exactly (field names,
// optionality). Frontmatter shapes in the migrated .mdx files are unchanged.

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  // strict: unknown frontmatter keys fail the build (typo protection for
  // editor-authored content) — runbook Phase 3 gate.
  schema: z
    .object({
      title: z.string(),
      description: z.string(),
      publishedAt: z.coerce.date(),
      coverImage: z.string().optional(),
    })
    .strict(),
});

const caseStudies = defineCollection({
  loader: glob({ base: './src/content/case-studies', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      title: z.string(),
      industry: z.string(),
      companySize: z.string(),
      challenge: z.string(),
      result: z.string(),
      isIllustrative: z.boolean().default(true),
    })
    .strict(),
});

export const collections = { posts, caseStudies };
