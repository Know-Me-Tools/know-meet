/**
 * VS-2 bundle-identity check (c03 task 3.3).
 *
 *   node tests/fidelity/src/bundle-identity/check-bundle-identity.ts
 *       [--web apps/web/dist] [--tauri-conf apps/desktop/src-tauri/tauri.conf.json]
 *   node tests/fidelity/src/bundle-identity/check-bundle-identity.ts --compare <dirA> <dirB>
 *
 * Default mode resolves `build.frontendDist` from tauri.conf.json (relative to
 * the src-tauri directory, as Tauri does) and compares its content digest with
 * the web build's. Exit 0: identical; 1: digest mismatch (differing files are
 * listed); 2: usage error or a missing/unsupported input. A JSON receipt with
 * the digest pair is written to stdout.
 */
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { type DirectoryDigest, digestDirectory } from "../support/digests.ts";
import { REPO_ROOT } from "../support/repo-paths.ts";

interface Receipt {
  readonly check: "bundle-identity";
  readonly left: {
    readonly label: string;
    readonly path: string;
    readonly digest: string;
    readonly files: number;
  };
  readonly right: {
    readonly label: string;
    readonly path: string;
    readonly digest: string;
    readonly files: number;
  };
  readonly identical: boolean;
  readonly differences: readonly string[];
}

function argValue(argv: readonly string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function fail(message: string): never {
  process.stderr.write(`check-bundle-identity: ${message}\n`);
  process.exit(2);
}

function requireDir(path: string, label: string): string {
  if (!existsSync(path) || !statSync(path).isDirectory())
    fail(`${label} is not a directory: ${path}`);
  return realpathSync(path);
}

/** Resolves frontendDist the way Tauri 2 does: relative to the config file's directory. */
export function resolveFrontendDist(tauriConf: string): string {
  if (!existsSync(tauriConf)) fail(`tauri config not found: ${tauriConf}`);
  const conf = JSON.parse(readFileSync(tauriConf, "utf8")) as {
    build?: { frontendDist?: unknown };
  };
  const dist = conf.build?.frontendDist;
  if (typeof dist !== "string")
    fail(`${tauriConf}: build.frontendDist must be a directory path (got ${JSON.stringify(dist)})`);
  if (/^https?:\/\//.test(dist))
    fail(
      `${tauriConf}: build.frontendDist is a URL (${dist}); the desktop must embed the web build`,
    );
  return resolve(dirname(tauriConf), dist);
}

export function differences(a: DirectoryDigest, b: DirectoryDigest): string[] {
  const left = new Map(a.files.map((f) => [f.path, f.sha256]));
  const right = new Map(b.files.map((f) => [f.path, f.sha256]));
  const out: string[] = [];
  for (const [path, sha] of left) {
    const other = right.get(path);
    if (other === undefined) out.push(`only in left: ${path}`);
    else if (other !== sha) out.push(`content differs: ${path}`);
  }
  for (const path of right.keys()) if (!left.has(path)) out.push(`only in right: ${path}`);
  return out.sort();
}

export function compareDirectories(
  leftLabel: string,
  leftPath: string,
  rightLabel: string,
  rightPath: string,
): Receipt {
  const l = requireDir(leftPath, leftLabel);
  const r = requireDir(rightPath, rightLabel);
  const a = digestDirectory(l);
  const b = digestDirectory(r);
  if (a.files.length === 0) fail(`${leftLabel} is empty: ${l}`);
  return {
    check: "bundle-identity",
    left: { label: leftLabel, path: l, digest: a.digest, files: a.files.length },
    right: { label: rightLabel, path: r, digest: b.digest, files: b.files.length },
    identical: a.digest === b.digest,
    differences: differences(a, b),
  };
}

function main(argv: readonly string[]): number {
  const compare = argv.indexOf("--compare");
  const receipt =
    compare >= 0
      ? compareDirectories(
          "left",
          argv[compare + 1] ?? fail("--compare needs two directories"),
          "right",
          argv[compare + 2] ?? fail("--compare needs two directories"),
        )
      : compareDirectories(
          "frontendDist",
          resolveFrontendDist(
            resolve(
              REPO_ROOT,
              argValue(argv, "--tauri-conf") ?? "apps/desktop/src-tauri/tauri.conf.json",
            ),
          ),
          "web dist",
          resolve(REPO_ROOT, argValue(argv, "--web") ?? "apps/web/dist"),
        );
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (!receipt.identical) {
    for (const line of receipt.differences) process.stderr.write(`${line}\n`);
    process.stderr.write("check-bundle-identity: digest mismatch\n");
    return 1;
  }
  return 0;
}

if (
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(new URL(import.meta.url).pathname)
) {
  process.exitCode = main(process.argv.slice(2));
}
