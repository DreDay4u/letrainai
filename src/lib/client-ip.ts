/**
 * Client IP resolution for rate limiting.
 *
 * The site is fronted by Cloudflare, which sets CF-Connecting-IP to the
 * actual visitor. x-forwarded-for is attacker-controllable (a client can
 * send its own XFF and proxies append to it), so trusting its FIRST entry
 * let visitors rotate fake IPs past the per-IP limiters. Preference order:
 *   1. CF-Connecting-IP (set by Cloudflare, not forwardable by clients)
 *   2. x-real-ip (set by the reverse proxy)
 *   3. LAST entry of x-forwarded-for (closest proxy; still imperfect)
 *   4. "unknown" (shares one bucket — fail closed, never fail open)
 */
export function getClientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  return "unknown";
}
