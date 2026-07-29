/**
 * Canonical relative API path helpers.
 * Prevents nested baseURL bugs like:
 * /api/v1/http://localhost:8092/api/v1/location/report
 */

/** Repair http:/ → http:// produced by naive slash collapsing. */
function repairBrokenProtocols(url: string): string {
  return url.replace(/https?:\/(?!\/)/gi, (m) => m.replace(':/', '://'));
}

/**
 * Convert any axios/offline-queue URL into a clean relative path
 * suitable for an axios instance whose baseURL already ends with /api/v1.
 * Example: "http://localhost:8092/api/v1/location/report" → "/location/report"
 */
export function toRelativeApiPath(url?: string): string {
  if (!url) return '/';

  let u = String(url).trim();
  let query = '';
  const qIdx = u.indexOf('?');
  if (qIdx >= 0) {
    query = u.slice(qIdx);
    u = u.slice(0, qIdx);
  }
  const hIdx = u.indexOf('#');
  if (hIdx >= 0) u = u.slice(0, hIdx);

  u = repairBrokenProtocols(u);

  // Prefer the segment after the last /api/vN/ (handles nested absolute URLs)
  const markers = [...u.matchAll(/\/api\/v\d+\//gi)];
  if (markers.length > 0) {
    const last = markers[markers.length - 1];
    u = `/${u.slice((last.index ?? 0) + last[0].length)}`;
  } else if (/^https?:\/\//i.test(u)) {
    try {
      u = new URL(u).pathname || '/';
    } catch {
      /* keep */
    }
    u = u.replace(/^(?:\/?api\/v\d+)+/i, '');
    if (!u.startsWith('/')) u = `/${u}`;
  } else {
    u = u.replace(/^(?:\/?api\/v\d+)+/i, '');
    if (!u.startsWith('/')) u = `/${u}`;
  }

  u = u.replace(/\/{2,}/g, '/');
  if (u.length > 1 && u.endsWith('/')) u = u.slice(0, -1);
  return `${u || '/'}${query}`;
}

/** Normalize path for gate/auth checks (lowercase, no leading slash). */
export function normalizeApiPath(url?: string): string {
  const rel = toRelativeApiPath(url);
  return rel.replace(/^\//, '').toLowerCase();
}
