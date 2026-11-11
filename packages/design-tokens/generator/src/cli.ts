#!/usr/bin/env node
// Entry point. Usage:
//   node generator/src/cli.ts [--config <path>] [--check]
// --config defaults to ../../token-generator.config.json (the package's own).
// --check writes nothing and exits 1 when any output is stale.
import { resolve } from "node:path";
import { loadConfig } from "./config.ts";
import { EXIT, main, ToolError } from "./errors.ts";
import { generate } from "./generate.ts";
import { describe, writeOutputs } from "./output.ts";

interface Args {
  readonly config: string;
  readonly check: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  let config = resolve(import.meta.dirname, "../../token-generator.config.json");
  let check = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--check") check = true;
    else if (arg === "--config" && argv[i + 1] !== undefined) {
      config = resolve(argv[i + 1] ?? "");
      i += 1;
    } else {
      throw new ToolError(
        "usage: node generator/src/cli.ts [--config <path>] [--check]",
        EXIT.usage,
      );
    }
  }
  return { config, check };
}

await main(() => {
  const args = parseArgs(process.argv.slice(2));
  const { tokens, root, files } = generate(loadConfig(args.config));
  const results = writeOutputs(files, args.check);
  process.stdout.write(`${describe(results, root)}\n`);
  const stale = results.filter((r) => r.status === "stale").length;
  if (stale > 0)
    throw new ToolError(`${stale} generated file(s) are stale; run generate`, EXIT.drift);
  process.stdout.write(
    `design tokens ${tokens.version} (${tokens.keys.length} keys) -> ${files.length} files\n`,
  );
});
