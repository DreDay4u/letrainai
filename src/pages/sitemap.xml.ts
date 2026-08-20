import type { APIRoute } from 'astro';
import { getAllPosts, getAllCaseStudies } from '../lib/content';

export const GET: APIRoute = async () => {
  const baseUrl = 'https://letrainai.com';
  const staticRoutes = [
    '/', '/services', '/about', '/assessment', '/process',
    '/faq', '/contact', '/blog', '/case-studies',
  ];
  const posts = await getAllPosts();
  const studies = await getAllCaseStudies();

  interface Entry {
    loc: string;
    changefreq: string;
    priority: string;
    lastmod?: string;
  }

  const urls: Entry[] = [
    ...staticRoutes.map((r) => ({
      loc: baseUrl + r,
      changefreq: r === '/' || r === '/blog' ? 'weekly' : 'monthly',
      priority: r === '/' ? '1.0' : r === '/services' || r === '/assessment' ? '0.9' : '0.7',
    })),
    ...posts.map((p) => ({
      loc: baseUrl + '/blog/' + p.slug,
      changefreq: 'yearly',
      priority: '0.6',
      lastmod: p.publishedAt,
    })),
    ...studies.map((s) => ({
      loc: baseUrl + '/case-studies/' + s.slug,
      changefreq: 'yearly',
      priority: '0.6',
    })),
  ];

  const NL = String.fromCharCode(10);
  const entry = (u: Entry) =>
    '  <url>' + NL +
    '    <loc>' + u.loc + '</loc>' + NL +
    '    <changefreq>' + u.changefreq + '</changefreq>' + NL +
    '    <priority>' + u.priority + '</priority>' +
    (u.lastmod ? NL + '    <lastmod>' + u.lastmod + '</lastmod>' : '') +
    NL + '  </url>';

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' + NL +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + NL +
    urls.map(entry).join(NL) +
    NL + '</urlset>';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
