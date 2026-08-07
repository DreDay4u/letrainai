import { config, fields, collection } from '@keystatic/core';

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
        content: fields.document({
          label: 'Content',
          formatting: true,
          dividers: true,
          links: true,
        }),
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
        content: fields.document({ label: 'Content', formatting: true, dividers: true, links: true }),
      },
    }),
  },
});
