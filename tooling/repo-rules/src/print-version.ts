import { readVersions, requireVersion } from "./lib/versions.ts";

/** `node print-version.ts <section> <key>` prints one pin from tooling/versions.toml (used by CI). */
const [section = "", key = ""] = process.argv.slice(2);
process.stdout.write(`${requireVersion(readVersions(process.cwd()), section, key)}\n`);
