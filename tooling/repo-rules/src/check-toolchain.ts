import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwdFromArgs, report, type Violation } from "./lib/report.ts";
import { readVersions, requireVersion } from "./lib/versions.ts";

/**
 * Verifies installed tools against tooling/versions.toml (c01 task 1.5).
 * `--only node,pnpm` limits the check (CI runners lack desktop/mobile tools).
 */
interface Probe {
  readonly tool: string;
  readonly command: readonly string[];
  readonly wanted: string;
  readonly parse: (output: string) => string | undefined;
}

const cwd = cwdFromArgs(process.argv);
const versions = readVersions(cwd);
const pin = (key: string): string => requireVersion(versions, "toolchain", key);
const source = JSON.parse(readFileSync(join(cwd, "tooling/versions.source.json"), "utf8")) as {
  sourcePackageVersion: string;
};
const firstSemver = (output: string): string | undefined =>
  /\d+\.\d+\.\d+(?:-[\w.]+)?/.exec(output)?.[0];
const flutterField =
  (field: string) =>
  (output: string): string | undefined =>
    (JSON.parse(output) as Record<string, string>)[field];

const PROBES: readonly Probe[] = [
  { tool: "node", command: ["node", "--version"], wanted: pin("node"), parse: firstSemver },
  { tool: "pnpm", command: ["pnpm", "--version"], wanted: pin("pnpm"), parse: firstSemver },
  {
    tool: "typescript",
    command: ["pnpm", "exec", "tsc", "--version"],
    wanted: pin("typescript"),
    parse: firstSemver,
  },
  { tool: "rust", command: ["rustc", "--version"], wanted: pin("rust"), parse: firstSemver },
  {
    tool: "tauri-cli",
    command: ["cargo", "tauri", "--version"],
    wanted: requireVersion(versions, "frameworks", "tauri_cli"),
    parse: firstSemver,
  },
  {
    tool: "flutter",
    command: ["flutter", "--version", "--machine"],
    wanted: pin("flutter"),
    parse: flutterField("frameworkVersion"),
  },
  {
    tool: "flutter-channel",
    command: ["flutter", "--version", "--machine"],
    wanted: "stable",
    parse: flutterField("channel"),
  },
  {
    tool: "dart",
    command: ["dart", "--version"],
    wanted: requireVersion(versions, "platform", "dart"),
    parse: firstSemver,
  },
  {
    tool: "knowme-builder",
    command: ["knowme-builder", "--version"],
    wanted: source.sourcePackageVersion.replace("knowme-builder ", ""),
    parse: firstSemver,
  },
];

const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex >= 0 ? (process.argv[onlyIndex + 1] ?? "").split(",") : null;
const violations: Violation[] = [];
const selected = PROBES.filter((probe) => only === null || only.includes(probe.tool));
for (const probe of selected) {
  const [bin = "", ...args] = probe.command;
  const run = spawnSync(bin, args, { cwd, encoding: "utf8" });
  let found: string | undefined;
  try {
    found = run.status === 0 ? probe.parse(`${run.stdout}${run.stderr}`) : undefined;
  } catch {
    found = undefined;
  }
  const line = `${probe.tool}: wanted ${probe.wanted}, found ${found ?? "not installed"}`;
  process.stdout.write(`${line}\n`);
  if (found !== probe.wanted) violations.push({ path: probe.command.join(" "), message: line });
}
process.exitCode = report("check-toolchain", violations, selected.length);
