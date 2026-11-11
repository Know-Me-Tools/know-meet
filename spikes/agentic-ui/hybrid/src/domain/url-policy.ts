/**
 * URL allowlists for links and media (contract.md §3 "Markdown safety" and "CUSTOM events").
 * Pure functions: no framework, no DOM.
 */

const LINK_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:", "mailto:"]);
const MEDIA_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);

function parseUrl(raw: string, base?: string): URL | null {
  try {
    return base === undefined ? new URL(raw) : new URL(raw, base);
  } catch {
    return null;
  }
}

/** Links may only use http:, https: or mailto:. Relative links are refused (no base to trust). */
export function safeLinkHref(raw: string | undefined): string | null {
  if (raw === undefined || raw.trim() === "") return null;
  const url = parseUrl(raw.trim());
  if (url === null || !LINK_PROTOCOLS.has(url.protocol)) return null;
  return url.href;
}

/** Media may only load over http(s) from an allowlisted origin. */
export function isAllowedMediaUrl(raw: string | undefined, allowedOrigins: readonly string[]): boolean {
  if (raw === undefined || raw.trim() === "") return false;
  const url = parseUrl(raw.trim());
  if (url === null || !MEDIA_PROTOCOLS.has(url.protocol)) return false;
  return allowedOrigins.includes(url.origin);
}
