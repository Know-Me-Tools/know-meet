import { FLUTTER_PREP, flutterStep, rootStep, runSteps } from "./lib/native-steps.ts";
import { cwdFromArgs } from "./lib/report.ts";

/**
 * Zero-warning native lints. `--workspace` covers crates/**, services/bff and
 * apps/desktop/src-tauri. Flutter codegen runs first because analyze needs the
 * generated `.g.dart` files.
 */
const STEPS = [
  rootStep(
    "cargo clippy",
    "Cargo.toml",
    "cargo",
    "clippy",
    "--workspace",
    "--all-targets",
    "--locked",
    "--",
    "-D",
    "warnings",
  ),
  ...FLUTTER_PREP,
  flutterStep("flutter analyze", "flutter", "analyze", "--fatal-infos", "--fatal-warnings"),
];

process.exitCode = runSteps(STEPS, cwdFromArgs(process.argv)).length > 0 ? 1 : 0;
