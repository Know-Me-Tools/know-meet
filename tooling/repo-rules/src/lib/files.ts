import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, matchesGlob } from "node:path";

/** Tracked plus untracked-but-not-ignored files, the same set `git grep --untracked` sees. */
export function listRepoFiles(cwd: string): string[] {
  const out = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    {
      cwd,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  const unique = new Set(out.split("\0").filter((path) => path.length > 0));
  return [...unique].sort();
}

export function matchesAny(path: string, globs: readonly string[]): boolean {
  return globs.some((glob) => matchesGlob(path, glob));
}

const BINARY_PROBE_BYTES = 8000;

/** Returns file text, or null for binary or vanished files (deleted but still in the index). */
export function readText(cwd: string, path: string): string | null {
  let buffer: Buffer;
  try {
    buffer = readFileSync(join(cwd, path));
  } catch {
    return null;
  }
  if (buffer.subarray(0, BINARY_PROBE_BYTES).includes(0)) return null;
  return buffer.toString("utf8");
}

export function countLines(text: string): number {
  if (text.length === 0) return 0;
  const newlines = text.split("\n").length - 1;
  return text.endsWith("\n") ? newlines : newlines + 1;
}
