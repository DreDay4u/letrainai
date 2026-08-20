import { PUBLIC_EVENT_NAMES } from "./events";

/**
 * Lightweight client-side analytics helper (browser only).
 *
 * Sends public events to POST /api/events via fetch — the server records
 * them with the service-role key; the browser NEVER touches Supabase.
 * Fire-and-forget by design: failures are swallowed and never block UX.
 *
 * Event names are restricted at runtime to the strict catalogue; unknown
 * names are dropped client-side and would be rejected server-side anyway.
 */

const VALID = new Set<string>(PUBLIC_EVENT_NAMES);

export interface TrackOptions {
  sessionId?: string;
  page?: string;
  ctaId?: string;
  source?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
}

export function track(event: string, opts: TrackOptions = {}): void {
  try {
    if (!VALID.has(event)) return; // strict catalogue — drop unknown names
    const body: Record<string, unknown> = { event_name: event };
    if (opts.sessionId) body.session_id = opts.sessionId;
    if (opts.page) body.page = opts.page;
    if (opts.ctaId) body.cta_id = opts.ctaId;
    if (opts.source) body.source = opts.source;
    if (opts.utm) {
      if (opts.utm.source) body.utm_source = opts.utm.source;
      if (opts.utm.medium) body.utm_medium = opts.utm.medium;
      if (opts.utm.campaign) body.utm_campaign = opts.utm.campaign;
      if (opts.utm.content) body.utm_content = opts.utm.content;
      if (opts.utm.term) body.utm_term = opts.utm.term;
    }
    const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", blob);
    } else {
      void fetch("/api/events", {
        method: "POST",
        body: blob,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // never break the page over analytics
  }
}

/**
 * Grab UTM params from the current URL (if any) for attribution.
 */
export function utmFromLocation(): TrackOptions["utm"] {
  try {
    const params = new URLSearchParams(window.location.search);
    const out: NonNullable<TrackOptions["utm"]> = {};
    let found = false;
    const map: Array<[string, keyof typeof out]> = [
      ["utm_source", "source"],
      ["utm_medium", "medium"],
      ["utm_campaign", "campaign"],
      ["utm_content", "content"],
      ["utm_term", "term"],
    ];
    for (const [param, key] of map) {
      const v = params.get(param);
      if (v) {
        out[key] = v;
        found = true;
      }
    }
    return found ? out : undefined;
  } catch {
    return undefined;
  }
}
