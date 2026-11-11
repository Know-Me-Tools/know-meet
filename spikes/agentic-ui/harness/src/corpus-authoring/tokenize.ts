/**
 * Deterministic delta splitting. A "word" delta (a word plus its leading
 * whitespace) approximates 1-1.5 LLM tokens; tokensPerSecond paces deltas.
 */

export type Chunking = "words" | "chars" | "lines" | "single";

const WORD_PATTERN = /\s*\S+|\s+$/g;

export function splitDeltas(text: string, chunking: Chunking): string[] {
  if (text.length === 0) return [];
  switch (chunking) {
    case "single":
      return [text];
    case "chars":
      return Array.from(text);
    case "lines":
      return text.split(/(?<=\n)/);
    case "words":
      return text.match(WORD_PATTERN) ?? [text];
  }
}

/** Rough token estimate used for the long-markdown target (~4 chars/token). */
export function estimateTokens(text: string): number {
  return Math.round(text.length / 4);
}
