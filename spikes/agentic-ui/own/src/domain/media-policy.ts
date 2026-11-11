/**
 * Media and link allowlists (gate 16.5). Nothing is allowed by default:
 * - media (img/video/audio, A2UI Image/Video/AudioPlayer) loads only from an
 *   explicitly allowed origin over http(s); no data:, blob: or other schemes;
 * - links render as anchors only for an explicitly allowed origin (http/https
 *   are implied by the origin) or, when enabled, mailto:. Everything else
 *   renders as text.
 */

export type MediaVerdict = { readonly allowed: true; readonly url: string } | { readonly allowed: false; readonly reason: string };

export function checkMediaUrl(raw: unknown, allowedOrigins: readonly string[]): MediaVerdict {
  if (typeof raw !== "string" || raw.trim() === "") return { allowed: false, reason: "missing url" };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { allowed: false, reason: "unparsable url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { allowed: false, reason: `scheme ${url.protocol} not allowed` };
  if (!allowedOrigins.includes(url.origin)) return { allowed: false, reason: `origin ${url.origin} not allowed` };
  return { allowed: true, url: url.href };
}

export interface LinkPolicy {
  /** Exact origins (scheme://host[:port]) whose links render as anchors. */
  readonly origins: readonly string[];
  readonly allowMailto: boolean;
}

export type LinkVerdict = { readonly allowed: true; readonly href: string } | { readonly allowed: false; readonly reason: string };

export function checkLinkUrl(raw: unknown, base: string, policy: LinkPolicy): LinkVerdict {
  if (typeof raw !== "string" || raw.trim() === "") return { allowed: false, reason: "missing url" };
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return { allowed: false, reason: "unparsable url" };
  }
  if (url.protocol === "mailto:") return policy.allowMailto ? { allowed: true, href: url.href } : { allowed: false, reason: "mailto not allowed" };
  if (url.protocol !== "http:" && url.protocol !== "https:") return { allowed: false, reason: `scheme ${url.protocol} not allowed` };
  if (!policy.origins.includes(url.origin)) return { allowed: false, reason: `origin ${url.origin} not allowed` };
  return { allowed: true, href: url.href };
}
