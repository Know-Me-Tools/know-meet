import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import {
  BIOME_FIXTURES,
  BOUNDARY_FIXTURES,
  COLOUR_FIXTURES,
  SECRET_FIXTURES,
} from "../fixtures/content-fixtures.ts";
import type { Checker, RuleFixture } from "../fixtures/fixture-types.ts";
import { LINE_FIXTURES, NAME_FIXTURES } from "../fixtures/line-and-name-fixtures.ts";

const ROOT = resolve(import.meta.dirname, "../../..");
const BIN = join(ROOT, "node_modules/.bin");
const SRC = join(ROOT, "tooling/repo-rules/src");

const COMMANDS: Readonly<Record<Checker, (dir: string) => readonly string[]>> = {
  lines: (dir) => ["node", join(SRC, "check-lines.ts"), "--cwd", dir],
  colours: (dir) => ["node", join(SRC, "check-colours.ts"), "--cwd", dir],
  secrets: (dir) => ["node", join(SRC, "check-secrets.ts"), "--cwd", dir],
  boundaries: (dir) => ["node", join(SRC, "check-boundaries.ts"), "--cwd", dir],
  pins: (dir) => ["node", join(SRC, "check-pins.ts"), "--cwd", dir],
  names: () => [join(BIN, "ls-lint"), "--config", join(ROOT, "tooling/ls-lint/ls-lint.yml")],
  biome: () => [
    join(BIN, "biome"),
    "ci",
    "--colors=off",
    "--config-path=tooling/biome",
    "--error-on-warnings",
    "--no-errors-on-unmatched",
  ],
};

/** Materialises a fixture as a scratch git repository outside the committed tree. */
function scratchRepo(files: Readonly<Record<string, string>>): string {
  const dir = mkdtempSync(join(tmpdir(), "km-repo-rules-"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  writeFileSync(join(dir, ".gitignore"), "node_modules\n");
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

function run(checker: Checker, dir: string): { status: number | null; output: string } {
  if (checker === "biome") {
    // Biome resolves vcs.root against the --config-path it is given, so mirror the
    // production layout (relative config path, run from the repository root).
    mkdirSync(join(dir, "tooling/biome"), { recursive: true });
    copyFileSync(join(ROOT, "tooling/biome/biome.json"), join(dir, "tooling/biome/biome.json"));
  }
  const [bin = "", ...args] = COMMANDS[checker](dir);
  const result = spawnSync(bin, args, { cwd: dir, encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function exercise(fixture: RuleFixture): void {
  const dir = scratchRepo(fixture.files);
  try {
    const { status, output } = run(fixture.checker, dir);
    if (fixture.mustFail) {
      assert.notEqual(status, 0, `${fixture.id} should fail:\n${output}`);
      if (fixture.expectPath)
        assert.match(output, new RegExp(fixture.expectPath.replaceAll(".", "\\.")));
      if (fixture.expectText)
        assert.ok(
          output.includes(fixture.expectText),
          `${fixture.id} missing ${fixture.expectText}`,
        );
    } else {
      assert.equal(status, 0, `${fixture.id} should pass:\n${output}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const SUITES: Readonly<Record<string, readonly RuleFixture[]>> = {
  "500-line limit": LINE_FIXTURES,
  "kebab-case names": NAME_FIXTURES,
  "secret scans": SECRET_FIXTURES,
  "hex-colour scan": COLOUR_FIXTURES,
  "dependency direction (Dart)": BOUNDARY_FIXTURES,
  "Biome (no any, dependency direction)": BIOME_FIXTURES,
};

for (const [name, fixtures] of Object.entries(SUITES)) {
  describe(name, () => {
    for (const fixture of fixtures) it(fixture.id, () => exercise(fixture));
  });
}

describe("toolchain pins", () => {
  const PIN_FILES = [
    "package.json",
    "rust-toolchain.toml",
    "tooling/versions.toml",
    "tooling/versions.source.json",
  ];
  const copyPins = (): string => {
    const files = Object.fromEntries(
      PIN_FILES.map((path) => [path, readFileSync(join(ROOT, path), "utf8")]),
    );
    return scratchRepo(files);
  };
  const withRepo = (mutate: (dir: string) => void, mustFail: boolean): void => {
    const dir = copyPins();
    try {
      mutate(dir);
      const { status, output } = run("pins", dir);
      assert.equal(status !== 0, mustFail, output);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  it("pins-current-ok", () => withRepo(() => undefined, false));
  it("pins-rust-drift", () =>
    withRepo(
      (dir) => writeFileSync(join(dir, "rust-toolchain.toml"), '[toolchain]\nchannel = "1.99.1"\n'),
      true,
    ));
  it("pins-versions-edited", () =>
    withRepo(
      (dir) => writeFileSync(join(dir, "tooling/versions.toml"), "# edited\n", { flag: "a" }),
      true,
    ));
  it("pins-pnpm-drift", () =>
    withRepo((dir) => {
      const path = join(dir, "package.json");
      writeFileSync(path, readFileSync(path, "utf8").replace("pnpm@11.15.0", "pnpm@11.25.0"));
    }, true));
});
