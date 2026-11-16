/**
 * The only place verify-cluster starts a process. It spawns `kubectl` with an argument
 * array (never a shell string), always with an explicit --context, and only the verbs
 * `get` and `api-versions`. Nothing here can create, change or delete a cluster object.
 */
import { type ExecFileException, execFile } from "node:child_process";

import type { Recorder } from "./report.ts";

export type KubectlFailureKind = "missing" | "refused" | "failed";

/** A kubectl call that did not complete. `hint` is fixed wording; kubectl's stderr is not echoed. */
export class KubectlError extends Error {
  readonly kind: KubectlFailureKind;
  readonly hint: string;

  constructor(kind: KubectlFailureKind, hint: string) {
    super("kubectl call did not complete");
    this.name = "KubectlError";
    this.kind = kind;
    this.hint = hint;
  }
}

const READ_ONLY_VERBS: ReadonlySet<string> = new Set(["get", "api-versions"]);
const REQUEST_TIMEOUT = "30s";
const PROCESS_TIMEOUT_MS = 90_000;
const MAX_BUFFER = 64 * 1024 * 1024;

/**
 * Go template that prints the key names of a Secret's `.data` map, one per line.
 * `range $key, $unused := .data` binds each value to a variable the template never
 * mentions, so the output cannot contain a value. A jsonpath over `.data` would print
 * values unless it were written with extreme care; the template makes the safe form the
 * only form. `.data` absent (an empty Secret) ranges over nothing and prints nothing.
 */
export const SECRET_KEYS_TEMPLATE = '{{range $key, $unused := .data}}{{$key}}{{"\\n"}}{{end}}';

function outputIs(args: readonly string[], format: string): boolean {
  const at = args.indexOf("-o");
  return at >= 0 && args[at + 1] === format;
}

/** Any argument that names a Secret may only be read as names or as key names. */
function secretReadIsUnsafe(args: readonly string[]): boolean {
  if (!args.some((arg) => /secret/i.test(arg))) return false;
  const keysOnly = outputIs(args, "go-template") && args.includes(SECRET_KEYS_TEMPLATE);
  return !(keysOnly || outputIs(args, "name"));
}

/** The complete argv of one call. Throws when the call would not be read-only. */
export function buildArgv(context: string, args: readonly string[]): string[] {
  const verb = args[0];
  if (verb === undefined || !READ_ONLY_VERBS.has(verb)) {
    throw new KubectlError("refused", `kubectl verb ${verb ?? "(none)"} is not read-only`);
  }
  if (secretReadIsUnsafe(args)) {
    throw new KubectlError("refused", "a Secret may only be read as names or key names");
  }
  return ["--context", context, `--request-timeout=${REQUEST_TIMEOUT}`, ...args];
}

function hintFor(stderr: string, exitCode: string): string {
  if (/reauthentication|gke-gcloud-auth-plugin|getting credentials|unauthorized/i.test(stderr)) {
    return "kubectl authentication failed; the operator must refresh credentials (gcloud auth login)";
  }
  if (/forbidden/i.test(stderr)) {
    return "kubectl was refused (Forbidden); the account may not read this resource";
  }
  if (/context .*(not found|does not exist)|no context exists/i.test(stderr)) {
    return "the kubeconfig has no such context";
  }
  if (/unable to connect|dial tcp|i\/o timeout|deadline exceeded|no such host/i.test(stderr)) {
    return "the cluster API could not be reached";
  }
  if (/doesn't have a resource type|no matches for kind/i.test(stderr)) {
    return "the server does not serve that resource type";
  }
  return `kubectl exited with an error (${exitCode})`;
}

function describeFailure(error: ExecFileException, stderr: string): KubectlError {
  if (error.code === "ENOENT") {
    return new KubectlError("missing", "kubectl was not found on PATH");
  }
  if (error.killed === true) {
    const seconds = PROCESS_TIMEOUT_MS / 1000;
    return new KubectlError("failed", `kubectl did not finish within ${seconds}s`);
  }
  return new KubectlError("failed", hintFor(stderr, `exit ${String(error.code ?? "unknown")}`));
}

export function failureText(error: unknown): string {
  if (error instanceof KubectlError) return error.hint;
  return `unexpected ${error instanceof Error ? error.name : "failure"}`;
}

/** One context, every argv recorded so the evidence shows exactly what was spawned. */
export class Kubectl {
  readonly context: string;
  readonly calls: string[][] = [];

  constructor(context: string) {
    this.context = context;
  }

  run(args: readonly string[]): Promise<string> {
    const argv = buildArgv(this.context, args);
    this.calls.push(argv);
    return new Promise((resolve, reject) => {
      execFile(
        "kubectl",
        argv,
        { encoding: "utf8", timeout: PROCESS_TIMEOUT_MS, maxBuffer: MAX_BUFFER, windowsHide: true },
        (error, stdout, stderr) => {
          if (error === null) resolve(stdout);
          else reject(describeFailure(error, stderr));
        },
      );
    });
  }

  async json(args: readonly string[]): Promise<unknown> {
    const text = await this.run(args);
    try {
      return JSON.parse(text);
    } catch {
      throw new KubectlError("failed", "kubectl output was not valid JSON");
    }
  }
}

/** Runs one step; a kubectl or unexpected failure becomes an `incomplete` result for `id`. */
export async function tryRead<T>(
  rec: Recorder,
  id: string,
  step: () => Promise<T>,
): Promise<T | null> {
  try {
    return await step();
  } catch (error) {
    rec.add(id, "incomplete", failureText(error));
    return null;
  }
}

export async function guarded(
  rec: Recorder,
  id: string,
  step: () => Promise<void>,
): Promise<void> {
  await tryRead(rec, id, step);
}

export function nonEmptyLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}
