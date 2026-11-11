export type Checker = "lines" | "names" | "colours" | "secrets" | "boundaries" | "biome" | "pins";

/** One scratch repository: `files` are written, then `checker` runs against it. */
export interface RuleFixture {
  readonly id: string;
  readonly checker: Checker;
  readonly files: Readonly<Record<string, string>>;
  /** true = negative fixture: the checker must exit non-zero and name `expectPath`. */
  readonly mustFail: boolean;
  readonly expectPath?: string;
  readonly expectText?: string;
}

export const lines = (count: number): string =>
  Array.from({ length: count }, (_, index) => `// line ${index + 1}\n`).join("");
