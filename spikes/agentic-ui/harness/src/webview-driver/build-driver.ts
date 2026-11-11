/**
 * Builds the in-webview driver as one classic script: strips TypeScript types
 * (node:module stripTypeScriptTypes), drops the module syntax (imports and the
 * `export` keyword; the files are written so both sit at line starts), wraps
 * everything in an IIFE that calls kmWebviewDriver(config), and optionally
 * prepends axe-core so the driver can run the settled-state axe check.
 */
import { readFileSync } from "node:fs";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { join } from "node:path";
import type { DriverConfig } from "../domain/spike-report.ts";

const SOURCES = ["instrumentation.ts", "page-actions.ts", "driver.ts"];

function toClassicScript(file: string): string {
  const source = readFileSync(join(import.meta.dirname, file), "utf8");
  const stripped = stripTypeScriptTypes(source, { mode: "strip" });
  return stripped
    .split("\n")
    .filter((line) => !/^\s*import\s.*from\s+"[^"]+";\s*$/.test(line))
    .map((line) => line.replace(/^export\s+/, ""))
    .join("\n");
}

function axeSource(): string {
  const require = createRequire(join(import.meta.dirname, "..", "..", "package.json"));
  const axeEntry = require.resolve("axe-core", { paths: [require.resolve("@axe-core/playwright")] });
  return readFileSync(join(axeEntry, "..", "axe.min.js"), "utf8");
}

export function buildDriverScript(config: DriverConfig): string {
  const body = SOURCES.map(toClassicScript).join("\n");
  const axe = config.axe ? `if (window.top === window) {\n${axeSource()}\n}\n` : "";
  return `${axe}(() => {\n"use strict";\n${body}\nkmWebviewDriver(${JSON.stringify(config)}).catch((e) => console.error("km driver", e));\n})();\n`;
}
