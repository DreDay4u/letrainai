import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /keystatic/',
    'Disallow: /report/', // per-buyer report artifacts — private, not content
    '',
    'Sitemap: https://letrainai.com/sitemap.xml',
  ];
  const body = lines.join(String.fromCharCode(10));
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
