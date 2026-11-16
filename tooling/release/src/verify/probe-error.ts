/**
 * Network failures of verify-endpoint. A name that does not resolve, a refused
 * connection or a bad certificate is a finding about the endpoint (fail). A timeout or
 * a resolver or route that is down locally says nothing certain about the endpoint, so
 * the check could not be completed (incomplete).
 */
import type { Status } from "./report.ts";

/** Raised by our own timers. `code` is `PROBE_TIMEOUT`. */
export class ProbeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProbeError";
    this.code = code;
  }
}

const INCOMPLETE_CODES: ReadonlySet<string> = new Set([
  "PROBE_TIMEOUT",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
]);

export function errorCode(error: unknown): string {
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return error instanceof Error ? error.name : "unknown";
}

export function classifyNetworkError(error: unknown): { status: Status; code: string } {
  const code = errorCode(error);
  return { status: INCOMPLETE_CODES.has(code) ? "incomplete" : "fail", code };
}
