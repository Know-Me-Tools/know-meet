import { listRepoFiles, matchesAny, readText } from "./lib/files.ts";
import { cwdFromArgs, report, type Violation } from "./lib/report.ts";

/**
 * Dependency direction for Dart (AGENTS.md "Dependencies point inward").
 * TypeScript is enforced by Biome noRestrictedImports (tooling/biome/biome.json).
 */
const INNER_LAYERS = ["**/domain/**/*.dart", "**/application/**/*.dart"];
const FORBIDDEN_IMPORT =
  /^\s*(?:import|export)\s+['"](package:flutter\/|package:flutter_riverpod\/|package:livekit_client\/|dart:ui|[^'"]*\/(?:infrastructure|presentation)\/)/;

const cwd = cwdFromArgs(process.argv);
const violations: Violation[] = [];
let scanned = 0;
for (const path of listRepoFiles(cwd)) {
  if (!matchesAny(path, INNER_LAYERS)) continue;
  const text = readText(cwd, path);
  if (text === null) continue;
  scanned += 1;
  text.split("\n").forEach((lineText, index) => {
    const match = FORBIDDEN_IMPORT.exec(lineText);
    if (match) {
      violations.push({
        path,
        line: index + 1,
        message: `domain/application imports outward (${match[1]}); depend on an application-owned port`,
      });
    }
  });
}
process.exitCode = report("check-boundaries", violations, scanned);
