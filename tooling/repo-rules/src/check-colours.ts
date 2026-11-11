import { listRepoFiles, matchesAny, readText } from "./lib/files.ts";
import { cwdFromArgs, report, type Violation } from "./lib/report.ts";

/**
 * No ad-hoc colours in app UI code (constraints.md design-tokens-single-source).
 * Colours come from docs/design/tokens.* through the generated token outputs.
 */
const SCANNED = [
  "apps/**/*.{ts,tsx,js,jsx,mjs,css,scss,html}",
  "packages/ui/**/*.{ts,tsx,js,jsx,mjs,css,scss}",
  "apps/mobile/lib/**/*.dart",
];

/** Generated token outputs and vendored code may carry literals. c04 must emit into these names. */
const ALLOWED = [
  "**/node_modules/**",
  "**/dist/**",
  "**/vendor/**",
  "**/*.g.dart",
  "**/generated/**",
  "**/*.generated.*",
  "**/src-tauri/gen/**",
  // shadcn chart: attribute selectors that neutralise recharts' built-in default strokes; not applied colours (c08 restyles).
  "apps/web/src/presentation/components/ui/chart.tsx",
];

const HEX_LITERAL = /(?<![\w&#/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const DART_COLOR = /\bColor(?:\.fromARGB|\.fromRGBO)?\(\s*(?:0x[0-9a-fA-F]{6,8}|\d)/g;

function scanText(path: string, text: string): Violation[] {
  const pattern = path.endsWith(".dart") ? DART_COLOR : HEX_LITERAL;
  const found: Violation[] = [];
  text.split("\n").forEach((lineText, index) => {
    for (const match of lineText.matchAll(pattern)) {
      found.push({
        path,
        line: index + 1,
        message: `ad-hoc colour ${match[0]}; use a design token`,
      });
    }
  });
  return found;
}

const cwd = cwdFromArgs(process.argv);
const violations: Violation[] = [];
let scanned = 0;
for (const path of listRepoFiles(cwd)) {
  if (!matchesAny(path, SCANNED) || matchesAny(path, ALLOWED)) continue;
  const text = readText(cwd, path);
  if (text === null) continue;
  scanned += 1;
  violations.push(...scanText(path, text));
}
process.exitCode = report("check-colours", violations, scanned);
