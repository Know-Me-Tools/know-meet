/** The four finding classes of tests/release/scan-contract.md. Fixed strings. */
export type FindingClass =
  | "livekit-env-value"
  | "livekit-api-secret-shape"
  | "jwt"
  | "manifest-secret-value";

export interface Finding {
  readonly class: FindingClass;
  readonly location: string;
}

/**
 * The scan could not complete (exit 2). `line` is the complete stderr text and is fixed
 * wording plus input names only: it never carries input bytes, because the underlying
 * error messages of JSON, zlib and child processes can.
 */
export class ScanError extends Error {
  readonly line: string;

  constructor(line: string) {
    super("scan could not complete");
    this.name = "ScanError";
    this.line = line;
  }
}

/** Keeps a location on one printable line. Paths can hold any byte, so control characters become `?`. */
export function printable(text: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point; they are replaced so output stays on one line.
  return text.replace(/[\u0000-\u001f\u007f]/g, "?");
}

export type Classify = (data: Buffer) => readonly FindingClass[];

/** Collects findings and counts. One finding per class and location, however many matches. */
export class Collector {
  readonly findings: Finding[] = [];
  inputs = 0;
  files = 0;
  private readonly seen = new Set<string>();
  private readonly redact: (text: string) => string;

  constructor(redact: (text: string) => string) {
    this.redact = redact;
  }

  add(cls: FindingClass, location: string): void {
    const safe = this.redact(printable(location));
    const key = `${cls}\u0000${safe}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.findings.push({ class: cls, location: safe });
  }

  /** Classifies one buffer and records every class that matched at `location`. */
  check(data: Buffer, location: string, classify: Classify): void {
    this.files += 1;
    for (const cls of classify(data)) this.add(cls, location);
  }
}
