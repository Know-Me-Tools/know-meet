// Replaces the vendor's `if (existsSync(dirname(path))) writeFileSync(...)`,
// which skipped a missing surface silently and left stale tokens in place.
// Here a missing output directory is a hard error, and --check reports drift
// without writing.
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { EXIT, ToolError } from "./errors.ts";

export interface OutputFile {
  readonly path: string;
  readonly content: string;
}

export type WriteStatus = "written" | "unchanged" | "stale";

export interface WriteResult {
  readonly path: string;
  readonly status: WriteStatus;
}

/** Banner for generated files. Deliberately carries no digest or version, so
 * changing one token changes only that token's lines in every output. */
export function banner(sourceLabel: string): readonly string[] {
  return [
    `GENERATED FROM ${sourceLabel} by @know-meet/design-tokens. DO NOT EDIT.`,
    "Edit the token source and run: pnpm --filter @know-meet/design-tokens generate",
  ];
}

export function requireOutputDirs(files: readonly OutputFile[]): void {
  const missing = [...new Set(files.map((f) => dirname(f.path)))].filter(
    (dir) => !existsSync(dir) || !statSync(dir).isDirectory(),
  );
  if (missing.length > 0) {
    throw new ToolError(
      `output directory missing (create it or fix token-generator.config.json):\n  ${missing.join("\n  ")}`,
      EXIT.missingOutput,
    );
  }
}

export function writeOutputs(files: readonly OutputFile[], check: boolean): WriteResult[] {
  requireOutputDirs(files);
  return files.map(({ path, content }) => {
    const current = existsSync(path) ? readFileSync(path, "utf8") : null;
    if (current === content) return { path, status: "unchanged" };
    if (check) return { path, status: "stale" };
    writeFileSync(path, content);
    return { path, status: "written" };
  });
}

export function describe(results: readonly WriteResult[], root: string): string {
  return results.map((r) => `${r.status.padEnd(9)} ${relative(root, r.path)}`).join("\n");
}
