/**
 * Streamdown sanitising configuration as data (gate 16.5). Pure: no React, so
 * node tests can enumerate it. Streamdown 2.7.1's own default rehype chain is
 * raw -> sanitize -> harden with allowedLinkPrefixes ["*"], allowedImagePrefixes
 * ["*"], allowedProtocols ["*"] and allowDataImages true (allow-all); O replaces
 * that chain with sanitize -> harden(configured below) and never runs rehype-raw.
 */
import type { LinkPolicy } from "../domain/media-policy.ts";

export interface MarkdownPolicy {
  /** Origin relative URLs resolve against (the app's own origin). */
  readonly baseOrigin: string;
  readonly links: LinkPolicy;
  /** Exact origins media may load from. */
  readonly mediaOrigins: readonly string[];
}

/** Options for rehype-harden (the shape its `harden()` accepts). */
export interface HardenOptions {
  readonly defaultOrigin: string;
  readonly allowedLinkPrefixes: string[];
  readonly allowedImagePrefixes: string[];
  readonly allowedProtocols: string[];
  readonly allowDataImages: boolean;
  readonly linkBlockPolicy: "indicator" | "text-only" | "remove";
  readonly imageBlockPolicy: "indicator" | "text-only" | "remove";
}

/** Origin-scoped prefixes only ("https://host/"), never "*". */
export function buildHardenOptions(policy: MarkdownPolicy): HardenOptions {
  const prefixes = (origins: readonly string[]): string[] => origins.filter((o) => /^https?:\/\/[^/]+$/.test(o)).map((o) => `${o}/`);
  return {
    defaultOrigin: policy.baseOrigin,
    allowedLinkPrefixes: prefixes(policy.links.origins),
    allowedImagePrefixes: prefixes(policy.mediaOrigins),
    allowedProtocols: [],
    allowDataImages: false,
    linkBlockPolicy: "text-only",
    imageBlockPolicy: "indicator",
  };
}
