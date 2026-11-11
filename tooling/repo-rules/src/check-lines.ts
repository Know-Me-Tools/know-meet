import { countLines, listRepoFiles, matchesAny, readText } from "./lib/files.ts";
import { cwdFromArgs, report, type Violation } from "./lib/report.ts";
import { ALL_LINE_EXCEPTION_GLOBS, LINE_LIMIT } from "./line-exceptions.ts";

export function checkLines(cwd: string): { violations: Violation[]; scanned: number } {
  const violations: Violation[] = [];
  let scanned = 0;
  for (const path of listRepoFiles(cwd)) {
    if (matchesAny(path, ALL_LINE_EXCEPTION_GLOBS)) continue;
    const text = readText(cwd, path);
    if (text === null) continue;
    scanned += 1;
    const lines = countLines(text);
    if (lines > LINE_LIMIT) {
      violations.push({
        path,
        message: `${lines} lines exceeds the ${LINE_LIMIT}-line limit; split it into a feature directory by clean-architecture layer (AGENTS.md)`,
      });
    }
  }
  return { violations, scanned };
}

const { violations, scanned } = checkLines(cwdFromArgs(process.argv));
process.exitCode = report("check-lines", violations, scanned);
