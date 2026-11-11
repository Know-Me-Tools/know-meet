import { readFileSync } from "node:fs";
import { join } from "node:path";

export type VersionTable = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** Minimal reader for versions.toml: `[section]` headers and `key = "value"` lines only. */
export function readVersions(cwd: string): VersionTable {
  const text = readFileSync(join(cwd, "tooling/versions.toml"), "utf8");
  const table: Record<string, Record<string, string>> = {};
  let section = "";
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    const header = /^\[([\w.-]+)\]$/.exec(line);
    if (header?.[1]) {
      section = header[1];
      table[section] = {};
      continue;
    }
    const entry = /^([\w-]+)\s*=\s*"([^"]*)"$/.exec(line);
    const target = table[section];
    if (entry?.[1] && entry[2] !== undefined && target) target[entry[1]] = entry[2];
  }
  return table;
}

export function requireVersion(table: VersionTable, section: string, key: string): string {
  const value = table[section]?.[key];
  if (value === undefined) throw new Error(`tooling/versions.toml is missing [${section}].${key}`);
  return value;
}
