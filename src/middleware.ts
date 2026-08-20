import { defineMiddleware } from 'astro:middleware';

// Noindex for the Keystatic admin (injected route /keystatic/[...params] can't
// carry frontmatter, so we set the header here). Also covers /dreday4u redirect.
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (pathname === '/keystatic' || pathname.startsWith('/keystatic/')) {
    const response = await next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  return next();
});
