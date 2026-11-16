/**
 * Cluster pre-flight (adopted contract, boundary packet). Confirms, before anything is
 * applied, that the cluster still matches the facts the Know Meet manifests depend on:
 * the Envoy Gateway controller runs, gateway.networking.k8s.io/v1 is served, both
 * ClusterIssuers are Ready, external-dns and Argo CD run, and the operator-created
 * Secret exists by name with its three key names. It does not require a GatewayClass.
 *
 *   node tooling/release/src/verify-cluster.ts --context <kubectl context> [--json <path>]
 *
 * Strictly read-only: it spawns only `kubectl get` and `kubectl api-versions`, always with
 * the explicit --context, and never reads a Secret value. It refuses to run without
 * --context. Exit 0: every check passed. Exit 1: at least one check failed. Exit 2: a
 * check could not be completed (kubectl missing, no credentials, unreachable cluster) or
 * the command line was wrong; 2 wins over 1 because nothing can be certified.
 */
import { parseArgs } from "node:util";

import { runClusterChecks } from "./verify/cluster-run.ts";
import { Kubectl } from "./verify/kubectl.ts";
import {
  countByStatus,
  exitCodeFor,
  Recorder,
  summaryLine,
  UsageError,
  writeJsonReport,
} from "./verify/report.ts";

/** kubectl context names: letters, digits and . _ : @ / - , never a leading hyphen. */
const CONTEXT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]*$/;

interface Options {
  readonly context: string;
  readonly json: string | undefined;
}

function readOptions(argv: readonly string[]): Options {
  const usage = "ERROR usage expected --context <kubectl context> and optionally --json <path>";
  try {
    const { values } = parseArgs({
      args: [...argv],
      allowPositionals: false,
      strict: true,
      options: { context: { type: "string" }, json: { type: "string" } },
    });
    if (values.context === undefined || !CONTEXT_PATTERN.test(values.context)) {
      throw new UsageError("ERROR usage --context is required and must be a kubectl context name");
    }
    return { context: values.context, json: values.json };
  } catch (error) {
    throw error instanceof UsageError ? error : new UsageError(usage);
  }
}

function writeReport(path: string, kc: Kubectl, rec: Recorder, code: number): void {
  writeJsonReport(path, {
    tool: "verify-cluster",
    context: kc.context,
    completed: code !== 2,
    exitCode: code,
    summary: countByStatus(rec.results),
    checks: rec.results,
    kubectlCalls: kc.calls,
  });
}

async function main(argv: readonly string[]): Promise<number> {
  let options: Options;
  try {
    options = readOptions(argv);
  } catch (error) {
    process.stderr.write(`${error instanceof UsageError ? error.line : "ERROR usage"}\n`);
    return 2;
  }
  const kc = new Kubectl(options.context);
  const rec = new Recorder();
  try {
    await runClusterChecks(kc, rec);
  } catch (error) {
    // Only the error class: a message can carry kubectl output.
    const name = error instanceof Error ? error.name : "unknown";
    rec.add("verify-cluster", "incomplete", `unexpected ${name}`);
  }
  const code = exitCodeFor(rec.results);
  process.stdout.write(`${summaryLine(rec.results)}\n`);
  if (options.json !== undefined) {
    try {
      writeReport(options.json, kc, rec, code);
    } catch {
      process.stderr.write("ERROR report-write-failed the --json report could not be written\n");
      return 2;
    }
  }
  return code;
}

process.exitCode = await main(process.argv.slice(2));
