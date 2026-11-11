/** CLI arguments for `pnpm measure`. */
import { DEFAULT_PORTS } from "../shared/placeholders.ts";

export type MeasureBrowser = "chromium" | "webkit";

export interface MeasureArgs {
  readonly url: string;
  readonly prototype: string;
  readonly dist: string | null;
  readonly scenarios: readonly string[] | null;
  readonly repeats: number;
  readonly harnessUrl: string;
  readonly rate: string | null;
  readonly gap: string | null;
  readonly browser: MeasureBrowser;
  readonly headed: boolean;
}

export const USAGE = `Usage: pnpm measure --url <prototype-url> --prototype <name> [options]

  --url <url>            prototype page (any URL: Vite preview, Tauri dev server, ...)
  --prototype <name>     label; output is reports/measure-<name>.json
  --dist <dir>           also report raw/gzip/brotli sizes of a built dist/ directory
  --scenarios <a,b,...>  scenario ids (default: every non-interactive AG-UI scenario + hostile/huge-table)
  --repeats <n>          runs per scenario, median reported (default 3)
  --harness <url>        mock server (default http://127.0.0.1:${DEFAULT_PORTS.mock}); started in-process if down
  --rate <n|max>         override deltas/s for every scenario (default: corpus pacing)
  --gap <ms>             override the gap before non-delta events
  --browser <name>       chromium (default) or webkit (no heap or long-task data)
  --headed               show the browser
  --dist-only            skip the browser and only size --dist
`;

function need(argv: readonly string[], i: number, flag: string): string {
  const value = argv[i + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${flag} needs a value\n\n${USAGE}`);
  return value;
}

export interface ParsedArgs extends MeasureArgs {
  readonly distOnly: boolean;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--help" || arg === "-h") throw new Error(USAGE);
    if (arg === "--headed" || arg === "--dist-only") {
      flags.add(arg);
      continue;
    }
    if (!arg.startsWith("--")) throw new Error(`unexpected argument "${arg}"\n\n${USAGE}`);
    values.set(arg, need(argv, i, arg));
    i += 1;
  }
  const distOnly = flags.has("--dist-only");
  const url = values.get("--url") ?? "";
  if (url === "" && !distOnly) throw new Error(`--url is required\n\n${USAGE}`);
  const prototype = (values.get("--prototype") ?? "").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  if (prototype === "") throw new Error(`--prototype is required\n\n${USAGE}`);
  const repeats = Number(values.get("--repeats") ?? "3");
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 50) throw new Error("--repeats must be an integer 1-50");
  const browser = values.get("--browser") ?? "chromium";
  if (browser !== "chromium" && browser !== "webkit") throw new Error("--browser must be chromium or webkit");
  const scenarios = values.get("--scenarios");
  return {
    url,
    prototype,
    dist: values.get("--dist") ?? null,
    scenarios: scenarios === undefined ? null : scenarios.split(",").map((s) => s.trim()).filter((s) => s !== ""),
    repeats,
    harnessUrl: (values.get("--harness") ?? `http://127.0.0.1:${DEFAULT_PORTS.mock}`).replace(/\/$/, ""),
    rate: values.get("--rate") ?? null,
    gap: values.get("--gap") ?? null,
    browser,
    headed: flags.has("--headed"),
    distOnly,
  };
}
