import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwdFromArgs, report, type Violation } from "./lib/report.ts";
import { readVersions, requireVersion } from "./lib/versions.ts";

/** Fails when tooling/versions.toml drifts from its recorded digest or from any derived pin. */
interface PackageJson {
  readonly packageManager?: string;
  readonly engines?: { readonly node?: string; readonly pnpm?: string };
  readonly devDependencies?: { readonly typescript?: string };
}

const cwd = cwdFromArgs(process.argv);
const read = (path: string): string => readFileSync(join(cwd, path), "utf8");
const violations: Violation[] = [];
const expect = (path: string, label: string, actual: string | undefined, wanted: string): void => {
  if (actual !== wanted)
    violations.push({
      path,
      message: `${label} is ${actual ?? "missing"}, versions.toml says ${wanted}`,
    });
};

const source = JSON.parse(read("tooling/versions.source.json")) as {
  sha256: string;
};
const digest = createHash("sha256")
  .update(readFileSync(join(cwd, "tooling/versions.toml")))
  .digest("hex");
expect("tooling/versions.toml", "sha256", digest, source.sha256);

const versions = readVersions(cwd);
const rust = requireVersion(versions, "toolchain", "rust");
const node = requireVersion(versions, "toolchain", "node");
const pnpm = requireVersion(versions, "toolchain", "pnpm");
const typescript = requireVersion(versions, "toolchain", "typescript");

const channel = /^\s*channel\s*=\s*"([^"]+)"/m.exec(read("rust-toolchain.toml"))?.[1];
expect("rust-toolchain.toml", "toolchain.channel", channel, rust);

const pkg = JSON.parse(read("package.json")) as PackageJson;
expect("package.json", "packageManager", pkg.packageManager, `pnpm@${pnpm}`);
expect("package.json", "engines.node", pkg.engines?.node, node);
expect("package.json", "engines.pnpm", pkg.engines?.pnpm, pnpm);
expect("package.json", "devDependencies.typescript", pkg.devDependencies?.typescript, typescript);

process.exitCode = report("check-pins", violations, 3);
