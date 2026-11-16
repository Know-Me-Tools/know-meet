/**
 * Public endpoint check (WR-3 oracle, boundary packet). After Argo CD reports healthy,
 * confirms what a visitor sees at the hostname: the name resolves, the TLS certificate
 * names the host, is unexpired and is issued by Let's Encrypt production, plain http
 * redirects to https on the same host, and GET / and GET /api/healthz over https return
 * 200 with the WR-3 security headers. Header rules mirror tests/release/src/header-checks.ts.
 *
 *   node tooling/release/src/verify-endpoint.ts --host meet.know-me.tools \
 *     [--csp-file apps/web/dist-hosted-csp.txt] [--allow-staging] [--json <report path>]
 *
 * --host takes one bare hostname. --csp-file makes the CSP header have to equal the file's
 * content exactly. --allow-staging reports a Let's Encrypt staging certificate without
 * failing (staging-first step); it is off by default.
 *
 * Read-only: it only resolves, handshakes and sends GET requests with no credentials, never
 * follows a redirect, never reads a body and never prints a cookie. Every network call is
 * bounded by a timeout. Exit 0: every check passed. Exit 1: at least one check failed.
 * Exit 2: a check could not be completed (timeout, resolver down) or the command line,
 * the --csp-file or the --json path was wrong; 2 wins over 1.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import type { ResponseRecord } from "./verify/endpoint-http-checks.ts";
import { runEndpointChecks } from "./verify/endpoint-run.ts";
import { parseHost } from "./verify/host.ts";
import {
  countByStatus,
  exitCodeFor,
  Recorder,
  summaryLine,
  UsageError,
  writeJsonReport,
} from "./verify/report.ts";

interface Options {
  readonly host: string;
  readonly allowStaging: boolean;
  readonly cspFile: string | undefined;
  readonly json: string | undefined;
}

const USAGE = "ERROR usage expected --host and optionally --csp-file, --allow-staging and --json";

function readOptions(argv: readonly string[]): Options {
  try {
    const { values } = parseArgs({
      args: [...argv],
      allowPositionals: false,
      strict: true,
      options: {
        host: { type: "string" },
        "csp-file": { type: "string" },
        "allow-staging": { type: "boolean" },
        json: { type: "string" },
      },
    });
    if (values.host === undefined) throw new UsageError(USAGE);
    return {
      host: parseHost(values.host),
      allowStaging: values["allow-staging"] === true,
      cspFile: values["csp-file"],
      json: values.json,
    };
  } catch (error) {
    throw error instanceof UsageError ? error : new UsageError(USAGE);
  }
}

/** The file's content as the expected header value. Only a trailing newline is dropped. */
function readCsp(path: string | undefined): string | undefined {
  if (path === undefined) return undefined;
  let text: string;
  try {
    text = readFileSync(path, "utf8").replace(/[\r\n]+$/, "");
  } catch {
    throw new UsageError("ERROR input-file-unreadable the --csp-file could not be read");
  }
  if (text === "") throw new UsageError("ERROR input-file-empty the --csp-file is empty");
  return text;
}

function writeReport(
  path: string,
  options: Options,
  rec: Recorder,
  responses: readonly ResponseRecord[],
  code: number,
): void {
  const report = {
    tool: "verify-endpoint",
    host: options.host,
    allowStaging: options.allowStaging,
    cspChecked: options.cspFile !== undefined,
    completed: code !== 2,
    exitCode: code,
    summary: countByStatus(rec.results),
    checks: rec.results,
    responses,
  };
  writeJsonReport(path, report);
}

async function main(argv: readonly string[]): Promise<number> {
  let options: Options;
  let cspExact: string | undefined;
  try {
    options = readOptions(argv);
    cspExact = readCsp(options.cspFile);
  } catch (error) {
    process.stderr.write(`${error instanceof UsageError ? error.line : USAGE}\n`);
    return 2;
  }
  const rec = new Recorder();
  const responses: ResponseRecord[] = [];
  try {
    const { host, allowStaging } = options;
    await runEndpointChecks({ host, allowStaging, cspExact }, rec, responses);
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    rec.add("verify-endpoint", "incomplete", `unexpected ${name}`);
  }
  const code = exitCodeFor(rec.results);
  process.stdout.write(`${summaryLine(rec.results)}\n`);
  if (options.json !== undefined) {
    try {
      writeReport(options.json, options, rec, responses, code);
    } catch {
      process.stderr.write("ERROR report-write-failed the --json report could not be written\n");
      return 2;
    }
  }
  return code;
}

process.exitCode = await main(process.argv.slice(2));
