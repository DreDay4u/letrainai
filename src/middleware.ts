import { defineMiddleware } from 'astro:middleware';

// Keystatic runs in LOCAL mode (unauthenticated admin writing to disk).
// That is safe on a developer machine and NOT safe on a public server:
// anyone could read/edit content through /keystatic and its API routes.
// In production the admin is blocked unless explicitly re-enabled via
// KEYSTATIC_ADMIN_ENABLED=1 (writes there are still ephemeral — container
// FS — and never reach git; the real fix is GitHub-mode storage).
// Note: this middleware runs at request-time for on-demand routes only;
// /keystatic is injected by the integration and always on-demand, so the
// block covers it fully.
const keystaticEnabled = process.env.KEYSTATIC_ADMIN_ENABLED === '1';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (
    process.env.NODE_ENV === 'production' &&
    !keystaticEnabled &&
    (pathname === '/keystatic' || pathname.startsWith('/keystatic/') || pathname.startsWith('/api/keystatic/'))
  ) {
    return new Response('Not Found', { status: 404 });
  }

  const response = await next();

  if (pathname === '/keystatic' || pathname.startsWith('/keystatic/')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // Baseline security headers for on-demand responses (prerendered pages
  // are covered by the Cloudflare response-header rule on the zone).
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
});
