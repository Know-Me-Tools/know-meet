import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cwdFromArgs } from "./lib/report.ts";

/**
 * Zero-warning native lints. Each runs once its surface exists (Cargo
 * workspace from c05, Flutter app from c07); until then it says so explicitly.
 */
interface NativeLint {
  readonly name: string;
  readonly marker: string;
  readonly dir: string;
  readonly command: readonly [string, ...string[]];
}

const LINTS: readonly NativeLint[] = [
  {
    name: "cargo clippy",
    marker: "Cargo.toml",
    dir: ".",
    command: [
      "cargo",
      "clippy",
      "--workspace",
      "--all-targets",
      "--locked",
      "--",
      "-D",
      "warnings",
    ],
  },
  {
    name: "flutter analyze",
    marker: "apps/mobile/pubspec.yaml",
    dir: "apps/mobile",
    command: ["flutter", "analyze", "--fatal-infos", "--fatal-warnings"],
  },
];

const cwd = cwdFromArgs(process.argv);
let failed = 0;
for (const lint of LINTS) {
  if (!existsSync(join(cwd, lint.marker))) {
    process.stdout.write(`${lint.name}: not run (no ${lint.marker} yet)\n`);
    continue;
  }
  const [bin, ...args] = lint.command;
  const run = spawnSync(bin, args, { cwd: join(cwd, lint.dir), stdio: "inherit" });
  if (run.status !== 0) {
    failed += 1;
    process.stderr.write(`${lint.name}: failed (exit ${run.status ?? "signal"})\n`);
  }
}
process.exitCode = failed > 0 ? 1 : 0;
