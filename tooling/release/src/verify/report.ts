/**
 * Result model shared by verify-cluster and verify-endpoint: one line per check on
 * stdout, an optional JSON report, and the exit-code rule (0 clean, 1 a check failed,
 * 2 a check could not be completed; 2 wins because nothing can be certified).
 */
import { writeFileSync } from "node:fs";

export type Status = "pass" | "fail" | "incomplete" | "info" | "skipped";

export interface CheckResult {
  readonly id: string;
  readonly status: Status;
  readonly detail: string;
}

/** Bad command line. `line` is the complete stderr text (exit 2). */
export class UsageError extends Error {
  readonly line: string;

  constructor(line: string) {
    super("usage error");
    this.name = "UsageError";
    this.line = line;
  }
}

const LABELS: Readonly<Record<Status, string>> = {
  pass: "PASS",
  fail: "FAIL",
  incomplete: "INCOMPLETE",
  info: "INFO",
  skipped: "SKIP",
};

const DEFAULT_LIMIT = 600;

/** Keeps text on one printable line and bounded. Control characters become `?`. */
export function printable(text: string, limit: number = DEFAULT_LIMIT): string {
  const flat = text.replace(/[\u0000-\u001f\u007f]/g, "?");
  return flat.length > limit ? `${flat.slice(0, limit)}...` : flat;
}

/** Collects results and prints each one as it is recorded, so progress is visible. */
export class Recorder {
  readonly results: CheckResult[] = [];

  add(id: string, status: Status, detail: string): void {
    const result: CheckResult = { id, status, detail: printable(detail) };
    this.results.push(result);
    process.stdout.write(`${LABELS[status]} ${id} ${result.detail}\n`);
  }
}

export function countByStatus(results: readonly CheckResult[]): Readonly<Record<Status, number>> {
  const counts: Record<Status, number> = { pass: 0, fail: 0, incomplete: 0, info: 0, skipped: 0 };
  for (const result of results) counts[result.status] += 1;
  return counts;
}

export function exitCodeFor(results: readonly CheckResult[]): number {
  const counts = countByStatus(results);
  if (counts.incomplete > 0) return 2;
  return counts.fail > 0 ? 1 : 0;
}

export function summaryLine(results: readonly CheckResult[]): string {
  const c = countByStatus(results);
  return `SUMMARY pass=${c.pass} fail=${c.fail} incomplete=${c.incomplete} info=${c.info} skipped=${c.skipped}`;
}

export function writeJsonReport(path: string, body: object): void {
  writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`, "utf8");
}
