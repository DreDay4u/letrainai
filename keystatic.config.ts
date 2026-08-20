import { config, fields, collection } from '@keystatic/core';

// Keystatic LOCAL mode (locked decision: GitHub mode deferred to a later
// session with Andre). Schemas ported 1:1 from legacy-next/keystatic.config.tsx
// so the editor sees the same fields, including the isIllustrative checkbox.
export default config({
  storage: { kind: 'local' },
  collections: {
    posts: collection({
      label: 'Blog Posts',
      slugField: 'title',
      path: 'src/content/posts/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description' }),
        publishedAt: fields.date({ label: 'Published at' }),
        coverImage: fields.image({ label: 'Cover image', directory: 'public/images/blog' }),
        // fields.mdx (0.6.8): MDX editor; document features come via options,
        // not the legacy document({formatting,dividers,links}) props.
        content: fields.mdx({ label: 'Content' }),
      },
    }),
    caseStudies: collection({
      label: 'Case Studies',
      slugField: 'title',
      path: 'src/content/case-studies/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        industry: fields.text({ label: 'Industry' }),
        companySize: fields.text({ label: 'Company Size' }),
        challenge: fields.text({ label: 'Challenge' }),
        result: fields.text({ label: 'Result' }),
        isIllustrative: fields.checkbox({ label: 'Mark as Illustrative (not a real client)', defaultValue: true }),
        content: fields.mdx({ label: 'Content' }),
      },
    }),
  },
});
