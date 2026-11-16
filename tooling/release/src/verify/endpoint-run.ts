/**
 * Runs every verify-endpoint check in a fixed order. When the name does not resolve the
 * network checks are recorded as skipped: they would only repeat the same failure.
 */
import {
  checkHttpsPage,
  checkRedirect,
  HTTPS_PAGES,
  type ResponseRecord,
} from "./endpoint-http-checks.ts";
import { checkDns, checkTls } from "./endpoint-tls-checks.ts";
import type { Recorder } from "./report.ts";

/** Every network call is bounded by this. */
const NETWORK_TIMEOUT_MS = 10_000;

export interface EndpointOptions {
  readonly host: string;
  readonly allowStaging: boolean;
  /** Exact CSP header value read from --csp-file, or undefined. */
  readonly cspExact: string | undefined;
}

export async function runEndpointChecks(
  options: EndpointOptions,
  rec: Recorder,
  responses: ResponseRecord[],
): Promise<void> {
  const { host } = options;
  if (!(await checkDns(host, NETWORK_TIMEOUT_MS, rec))) {
    rec.add("endpoint-checks", "skipped", "not run: the name did not resolve");
    return;
  }
  await checkTls(host, options.allowStaging, NETWORK_TIMEOUT_MS, rec);
  await checkRedirect(host, NETWORK_TIMEOUT_MS, rec);
  const expected = { origin: `https://${host}`, cspExact: options.cspExact };
  for (const page of HTTPS_PAGES) {
    await checkHttpsPage(host, page, expected, NETWORK_TIMEOUT_MS, rec, responses);
  }
}
