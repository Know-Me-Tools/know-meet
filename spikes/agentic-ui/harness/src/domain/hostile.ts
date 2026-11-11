/**
 * Hostile markdown/media corpus item (corpus/hostile/*.json).
 *
 * Placeholders substituted at serve time by the mock server:
 *   {{ALLOWED_ORIGIN}} - the mock server origin that serves /media/* (on the allowlist)
 *   {{EVIL_ORIGIN}}    - the second listener; any request it receives is a failure
 * Payloads call `__kmXss('<item-id>')`; the checks install that sentinel.
 */

export type HostileCategory =
  | "xss-html"
  | "link-scheme"
  | "raw-svg"
  | "mermaid"
  | "streaming-fragment"
  | "huge-table"
  | "katex"
  | "media-origin";

export type HostileDelivery =
  | {
      readonly kind: "markdown";
      readonly markdown: string;
      /** How the server splits the text into TEXT_MESSAGE_CONTENT deltas. */
      readonly chunking: "words" | "chars" | "lines";
    }
  | {
      readonly kind: "custom";
      /** Optional lead-in text streamed before the CUSTOM event. */
      readonly markdown: string;
      readonly name: string;
      readonly value: Readonly<Record<string, unknown>>;
    };

export interface HostileSelectorRequirement {
  readonly selector: string;
  readonly minCount?: number;
  readonly count?: number;
}

export interface HostileAssertions {
  /** Selectors (inside the transcript) that must not match. Global forbids always apply too. */
  readonly forbiddenSelectors?: readonly string[];
  /** Selectors that must match after the message finalises. */
  readonly requiredSelectors?: readonly HostileSelectorRequirement[];
  /** Visible text that must appear (content preserved as text, not dropped). */
  readonly mustShowText?: readonly string[];
  /** Minimum requests the allowed media origin must receive (allowed media actually loads). */
  readonly allowedMediaRequestsMin?: number;
  /** The message must reach status "complete" within this many ms of the first delta. */
  readonly finalizeWithinMs?: number;
  /** Budget for summed long-task time while rendering this item (Chromium only). */
  readonly maxLongTaskMs?: number;
}

export interface HostileItem {
  readonly id: string;
  readonly category: HostileCategory;
  readonly title: string;
  readonly delivery: HostileDelivery;
  /** Plain-language safe outcome a reviewer can check by eye. */
  readonly expectedOutcome: string;
  readonly assert: HostileAssertions;
}

export interface HostileCorpusFile {
  readonly corpusFormatVersion: number;
  readonly description: string;
  readonly globalForbiddenSelectors: readonly string[];
  readonly items: readonly HostileItem[];
}
