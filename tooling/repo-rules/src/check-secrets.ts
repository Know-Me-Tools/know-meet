import { spawnSync } from "node:child_process";
import { cwdFromArgs, report, type Violation } from "./lib/report.ts";
import { SECRET_RULES, type SecretRule } from "./secret-rules.ts";

const GREP_NO_MATCH = 1;

function runRule(cwd: string, rule: SecretRule): Violation[] {
  const flags = ["grep", "--untracked", "-n", "-I", "-E", ...(rule.ignoreCase ? ["-i"] : [])];
  const result = spawnSync("git", [...flags, "-e", rule.pattern, "--", ...rule.pathspec], {
    cwd,
    encoding: "utf8",
  });
  if (result.status === GREP_NO_MATCH) return [];
  if (result.status !== 0) {
    return [
      {
        path: ".",
        message: `${rule.id}: git grep failed (${result.status}): ${result.stderr.trim()}`,
      },
    ];
  }
  return result.stdout
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const [path = "?", lineNo = "0"] = line.split(":", 2);
      // Never echo the matched value: it may be a live credential.
      return {
        path,
        line: Number(lineNo),
        message: `${rule.id}: possible secret assignment (value redacted)`,
      };
    });
}

const cwd = cwdFromArgs(process.argv);
const violations = SECRET_RULES.flatMap((rule) => runRule(cwd, rule));
process.exitCode = report("check-secrets", violations, SECRET_RULES.length);
