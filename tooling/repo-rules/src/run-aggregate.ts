import { cwdFromArgs } from "./lib/report.ts";
import {
  FLUTTER_PREP,
  flutterStep,
  type NativeStep,
  rootStep,
  runSteps,
} from "./lib/native-steps.ts";

/**
 * Native halves of the aggregate commands (c14). `pnpm run build` and
 * `pnpm run test` run the Turborepo task graph (web, design tokens, TypeScript
 * packages) and then this script for Rust/BFF, Tauri and Flutter. Every command
 * fails on warnings: `-D warnings` for rustc and `--fatal-infos` for Flutter.
 *
 *   node tooling/repo-rules/src/run-aggregate.ts build|test
 */
const CARGO = "Cargo.toml";

const BUILD: readonly NativeStep[] = [
  // Rust warnings are gated by `cargo clippy -D warnings` in lint; RUSTFLAGS stays untouched so sccache keys match.
  rootStep("cargo build -p bff", CARGO, "cargo", "build", "-p", "bff", "--locked"),
  rootStep(
    "tauri build --debug",
    "apps/desktop/src-tauri/tauri.conf.json",
    "pnpm",
    "--filter",
    "@know-meet/desktop",
    "run",
    "tauri",
    "build",
    "--debug",
    "--ci",
  ),
  // VS-2: the bundled frontend must equal apps/web/dist.
  rootStep(
    "bundle identity",
    "tests/fidelity/package.json",
    "pnpm",
    "--filter",
    "@know-meet/fidelity-tests",
    "run",
    "check:bundle-identity",
  ),
  ...FLUTTER_PREP,
  flutterStep("flutter build apk --debug", "flutter", "build", "apk", "--debug"),
  {
    ...flutterStep(
      "flutter build ios --simulator",
      "flutter",
      "build",
      "ios",
      "--simulator",
      "--no-codesign",
    ),
    platforms: ["darwin"],
  },
];

const TEST: readonly NativeStep[] = [
  rootStep("cargo test", CARGO, "cargo", "test", "--workspace", "--locked"),
  ...FLUTTER_PREP,
  flutterStep("flutter test", "flutter", "test"),
];

const MODES: Readonly<Record<string, readonly NativeStep[]>> = { build: BUILD, test: TEST };
const mode = process.argv[2] ?? "";
const steps = MODES[mode];
if (steps === undefined) {
  process.stderr.write("usage: run-aggregate.ts build|test [--cwd <dir>]\n");
  process.exit(2);
}

const failed = runSteps(steps, cwdFromArgs(process.argv));
process.stdout.write(
  failed.length === 0
    ? `\n${mode}: native surfaces pass\n`
    : `\n${mode}: FAILED ${failed.join(", ")}\n`,
);
process.exitCode = failed.length === 0 ? 0 : 1;
