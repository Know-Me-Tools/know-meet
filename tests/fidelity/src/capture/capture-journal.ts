/**
 * Resumable capture: every finished capture is appended to a journal next to
 * the baselines, so a run cut off by a session end can be relaunched and only
 * redo the cells it had not finished. A journaled image is reused only when
 * the capture key (environment, drivers, shared sources, fonts, inventory)
 * is unchanged, its page source still has the recorded sha256 and the PNG on
 * disk still has the recorded sha256. Failed captures are never journaled, so
 * they are always retried. The journal is removed once the manifest is written.
 */

import { appendFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { sha256, sha256File } from "../support/digests.ts";
import { BASELINES_DIR, repoPath } from "../support/repo-paths.ts";
import type { BaselineRecord, ReferenceRecord, SkippedRecord } from "./baseline-manifest.ts";

export const JOURNAL_PATH = join(BASELINES_DIR, ".capture-journal.jsonl");

export type JournalLine =
  | { readonly kind: "key"; readonly captureKey: string }
  | { readonly kind: "baseline"; readonly record: BaselineRecord }
  | { readonly kind: "reference"; readonly record: ReferenceRecord }
  | { readonly kind: "skipped"; readonly record: SkippedRecord }
  | { readonly kind: "page-error"; readonly capture: string; readonly message: string }
  | { readonly kind: "blocked"; readonly url: string };

export interface Resumed {
  readonly baselines: Map<string, BaselineRecord>;
  readonly references: Map<string, ReferenceRecord>;
  readonly skipped: Map<string, SkippedRecord>;
  readonly pageErrors: Array<{ capture: string; message: string }>;
  readonly blocked: string[];
}

/** Files whose content decides how every cell renders; any change invalidates the journal. */
export function captureKey(paths: readonly string[], environment: unknown): string {
  const parts = paths.map((path) => `${path}\0${sha256File(repoPath(path))}\n`).join("");
  return sha256(`${parts}${JSON.stringify(environment)}`);
}

export const cellKey = (id: string, theme: string, viewport: number): string =>
  `${id}|${theme}|${viewport}`;

function imageStillValid(
  rel: string,
  expected: string,
  source: string,
  sourceSha: string,
): boolean {
  const file = join(BASELINES_DIR, rel);
  return (
    existsSync(file) && sha256File(file) === expected && sha256File(repoPath(source)) === sourceSha
  );
}

function parseLines(text: string): JournalLine[] {
  const out: JournalLine[] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    try {
      out.push(JSON.parse(line) as JournalLine);
    } catch {
      // A line cut off mid-write by a killed process: ignore it, its cell is redone.
    }
  }
  return out;
}

/** Reads a journal written under the same capture key; anything else starts fresh. */
export function loadJournal(key: string): Resumed | undefined {
  if (!existsSync(JOURNAL_PATH)) return undefined;
  const lines = parseLines(readFileSync(JOURNAL_PATH, "utf8"));
  const first = lines[0];
  if (first === undefined || first.kind !== "key" || first.captureKey !== key) return undefined;
  const resumed: Resumed = {
    baselines: new Map(),
    references: new Map(),
    skipped: new Map(),
    pageErrors: [],
    blocked: [],
  };
  for (const line of lines) {
    if (line.kind === "baseline") {
      const r = line.record;
      if (imageStillValid(r.path, r.sha256, r.sourcePath, r.sourceSha256))
        resumed.baselines.set(cellKey(r.stateId, r.theme, r.viewport), r);
    } else if (line.kind === "reference") {
      const r = line.record;
      if (imageStillValid(r.path, r.sha256, r.sourcePath, r.sourceSha256))
        resumed.references.set(cellKey(r.referenceId, r.theme, r.viewport), r);
    } else if (line.kind === "skipped") {
      const r = line.record;
      resumed.skipped.set(cellKey(r.stateId, r.theme, r.viewport), r);
    } else if (line.kind === "page-error") {
      resumed.pageErrors.push({ capture: line.capture, message: line.message });
    } else if (line.kind === "blocked") {
      resumed.blocked.push(line.url);
    }
  }
  return resumed;
}

/** Starts a new journal (fresh run) or keeps appending to a matching one (resume). */
export function openJournal(key: string, resuming: boolean): (line: JournalLine) => void {
  if (!resuming) {
    rmSync(JOURNAL_PATH, { force: true });
    appendFileSync(JOURNAL_PATH, `${JSON.stringify({ kind: "key", captureKey: key })}\n`);
  }
  return (line) => appendFileSync(JOURNAL_PATH, `${JSON.stringify(line)}\n`);
}

export function closeJournal(): void {
  rmSync(JOURNAL_PATH, { force: true });
}
