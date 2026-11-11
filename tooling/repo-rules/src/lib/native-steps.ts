import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Shared native step runner for the aggregate commands (c14). Each step names
 * the surface marker that must exist, so a surface that has not landed says so
 * explicitly instead of passing silently.
 */
export interface NativeStep {
  readonly name: string;
  /** Path (relative to the repo root) that must exist for the step to apply. */
  readonly marker: string;
  /** Working directory relative to the repo root. */
  readonly dir: string;
  readonly command: readonly [string, ...string[]];
  /** Restricts the step to these platforms; others report an explicit skip. */
  readonly platforms?: readonly NodeJS.Platform[];
}

const FLUTTER_DIR = "apps/mobile";
const FLUTTER_MARKER = "apps/mobile/pubspec.yaml";

/**
 * Flutter codegen must precede analyze, test and build: the `.g.dart` files are
 * generated, not tracked (c07 close-out). `--enforce-lockfile` keeps pubspec.lock
 * authoritative.
 */
export const FLUTTER_PREP: readonly NativeStep[] = [
  {
    name: "flutter pub get",
    marker: FLUTTER_MARKER,
    dir: FLUTTER_DIR,
    command: ["flutter", "pub", "get", "--enforce-lockfile"],
  },
  {
    name: "build_runner",
    marker: FLUTTER_MARKER,
    dir: FLUTTER_DIR,
    command: ["dart", "run", "build_runner", "build", "--delete-conflicting-outputs"],
  },
];

export function flutterStep(name: string, ...command: [string, ...string[]]): NativeStep {
  return { name, marker: FLUTTER_MARKER, dir: FLUTTER_DIR, command };
}

export function rootStep(
  name: string,
  marker: string,
  ...command: [string, ...string[]]
): NativeStep {
  return { name, marker, dir: ".", command };
}

/**
 * Runs the steps in order and keeps going after a failure so one run names every
 * broken surface. Returns the names of the steps that failed.
 */
export function runSteps(steps: readonly NativeStep[], cwd: string): readonly string[] {
  const failed: string[] = [];
  for (const step of steps) {
    if (!existsSync(join(cwd, step.marker))) {
      process.stdout.write(`${step.name}: not run (no ${step.marker} yet)\n`);
      continue;
    }
    if (step.platforms !== undefined && !step.platforms.includes(process.platform)) {
      process.stdout.write(
        `${step.name}: not run (needs ${step.platforms.join("/")}, this is ${process.platform})\n`,
      );
      continue;
    }
    process.stdout.write(`\n-- ${step.name}: ${step.command.join(" ")}\n`);
    const [bin, ...args] = step.command;
    const run = spawnSync(bin, args, { cwd: join(cwd, step.dir), stdio: "inherit" });
    if (run.status !== 0) {
      failed.push(step.name);
      process.stderr.write(
        `${step.name}: failed (exit ${run.status ?? run.error?.message ?? "signal"})\n`,
      );
    }
  }
  return failed;
}
