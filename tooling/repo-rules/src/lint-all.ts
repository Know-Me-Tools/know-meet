import { spawnSync } from "node:child_process";

/**
 * `pnpm run lint`: runs every repo rule, keeps going after a failure so one
 * run names every offending path, and exits non-zero if any rule failed.
 * `--skip lint:native` is used by the pre-commit hook.
 */
const STEPS = [
  "lint:pins",
  "lint:names",
  "lint:lines",
  "lint:colours",
  "lint:secrets",
  "lint:boundaries",
  "lint:biome",
  "lint:native",
] as const;

const skipIndex = process.argv.indexOf("--skip");
const skipped = new Set(skipIndex >= 0 ? (process.argv[skipIndex + 1] ?? "").split(",") : []);

const failed: string[] = [];
for (const step of STEPS.filter((name) => !skipped.has(name))) {
  process.stdout.write(`\n== ${step}\n`);
  const run = spawnSync("pnpm", ["run", "--silent", step], {
    stdio: "inherit",
  });
  if (run.status !== 0) failed.push(step);
}
process.stdout.write(
  failed.length === 0 ? "\nlint: all rules pass\n" : `\nlint: FAILED ${failed.join(", ")}\n`,
);
process.exitCode = failed.length === 0 ? 0 : 1;
