/**
 * Builds the gate 16.4 accessibility agent as one classic initialization script,
 * the same way ../build-driver.ts builds the conformance driver: axe-core first,
 * then ../instrumentation.ts, ../page-actions.ts and a11y-agent.ts with types
 * stripped and module syntax removed, wrapped in an IIFE calling kmA11yAgent(config).
 */
import { readFileSync } from "node:fs";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { join } from "node:path";
import type { A11yAgentConfig } from "./a11y-types.ts";

const DRIVER_DIR = join(import.meta.dirname, "..");
const SOURCES = [join(DRIVER_DIR, "instrumentation.ts"), join(DRIVER_DIR, "page-actions.ts"), join(import.meta.dirname, "a11y-agent.ts")];

function toClassicScript(path: string): string {
  const stripped = stripTypeScriptTypes(readFileSync(path, "utf8"), { mode: "strip" });
  return stripped
    .split("\n")
    .filter((line) => !/^\s*import\s.*from\s+"[^"]+";\s*$/.test(line))
    .map((line) => line.replace(/^export\s+/, ""))
    .join("\n");
}

function axeSource(): string {
  const require = createRequire(join(DRIVER_DIR, "..", "..", "package.json"));
  const axeEntry = require.resolve("axe-core", { paths: [require.resolve("@axe-core/playwright")] });
  return readFileSync(join(axeEntry, "..", "axe.min.js"), "utf8");
}

export function buildA11yAgentScript(config: A11yAgentConfig): string {
  const body = SOURCES.map(toClassicScript).join("\n");
  return `if (window.top === window) {\n${axeSource()}\n}\n(() => {\n"use strict";\n${body}\nkmA11yAgent(${JSON.stringify(config)}).catch((e) => console.error("km a11y agent", e));\n})();\n`;
}
