import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";

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
  /** Kills the step and fails it after this many milliseconds (bounds hangs). */
  readonly timeoutMs?: number;
}

/**
 * Resolves the Flutter SDK root so `flutter` and its bundled `dart` run from
 * the same SDK. Order: FLUTTER_ROOT, `flutter` on PATH, then common install
 * homes (fvm, puro, ~/development, Homebrew). A standalone `dart` on PATH can
 * be older than the Dart bundled with Flutter, so steps never rely on it.
 */
export function resolveFlutterRoot(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const isRoot = (root: string): boolean => existsSync(join(root, "bin", "flutter"));
  const fromEnv = env["FLUTTER_ROOT"];
  if (fromEnv !== undefined && fromEnv !== "" && isRoot(fromEnv)) return fromEnv;
  for (const dir of (env["PATH"] ?? "").split(delimiter)) {
    if (dir !== "" && existsSync(join(dir, "flutter"))) return dirname(dir);
  }
  const home = homedir();
  const candidates = [
    join(home, "fvm", "default"),
    join(home, ".fvm", "default"),
    join(home, ".puro", "envs", "stable", "flutter"),
    join(home, "development", "flutter"),
    join(home, "flutter"),
    "/opt/homebrew/share/flutter",
    "/usr/local/share/flutter",
  ];
  return candidates.find(isRoot);
}

const FLUTTER_DIR = "apps/mobile";
const FLUTTER_MARKER = "apps/mobile/pubspec.yaml";
/** build_runner has hung before; a bounded run fails loudly instead of stalling lint. */
const BUILD_RUNNER_TIMEOUT_MS = 10 * 60 * 1000;

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
    command: ["dart", "run", "build_runner", "build"],
    timeoutMs: BUILD_RUNNER_TIMEOUT_MS,
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
    const flutterRoot = bin === "flutter" || bin === "dart" ? resolveFlutterRoot() : undefined;
    const env =
      flutterRoot === undefined
        ? process.env
        : {
            ...process.env,
            FLUTTER_ROOT: flutterRoot,
            PATH: `${join(flutterRoot, "bin")}${delimiter}${process.env["PATH"] ?? ""}`,
          };
    const run = spawnSync(flutterRoot === undefined ? bin : join(flutterRoot, "bin", bin), args, {
      cwd: join(cwd, step.dir),
      stdio: "inherit",
      env,
      timeout: step.timeoutMs,
    });
    if (run.status !== 0) {
      failed.push(step.name);
      process.stderr.write(
        `${step.name}: failed (exit ${run.status ?? run.error?.message ?? run.signal ?? "signal"})\n`,
      );
    }
  }
  return failed;
}
