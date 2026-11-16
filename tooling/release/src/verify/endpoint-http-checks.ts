/**
 * The HTTP checks of verify-endpoint: plain http redirects to https on the same host,
 * and GET / and GET /api/healthz over https return 200 with the WR-3 security headers.
 * Redirects are never followed, so a redirect to another host is a failure, not a visit.
 */
import { type HeaderExpectations, headerProblems } from "./header-rules.ts";
import { type HttpResult, httpGet, printResponse } from "./http-probe.ts";
import { classifyNetworkError } from "./probe-error.ts";
import type { Recorder } from "./report.ts";

const REDIRECT_STATUSES: readonly number[] = [301, 302, 303, 307, 308];

export interface ResponseRecord {
  readonly label: string;
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly cookieCount: number;
}

export interface HttpsPage {
  readonly id: string;
  readonly path: string;
}

export const HTTPS_PAGES: readonly HttpsPage[] = [
  { id: "https-root", path: "/" },
  { id: "https-healthz", path: "/api/healthz" },
];

/** Where a redirect points, or null when the Location header is absent or unreadable. */
function redirectTarget(host: string, result: HttpResult): URL | null {
  const location = result.headers["location"];
  if (location === undefined) return null;
  try {
    return new URL(location, `http://${host}/`);
  } catch {
    return null;
  }
}

export async function checkRedirect(host: string, timeoutMs: number, rec: Recorder): Promise<void> {
  const id = "http-redirect";
  try {
    const result = await httpGet({ secure: false, host, path: "/", timeoutMs });
    if (!REDIRECT_STATUSES.includes(result.status)) {
      rec.add(id, "fail", `http://${host}/ returned ${result.status}, expected a redirect`);
      return;
    }
    const target = redirectTarget(host, result);
    const sameHost = target !== null && target.hostname === host;
    const https = target !== null && target.protocol === "https:";
    const port = target !== null && (target.port === "" || target.port === "443");
    const shown = target === null ? "no usable Location" : `${target.origin}${target.pathname}`;
    const text = `http://${host}/ returned ${result.status} to ${shown}`;
    if (target !== null && sameHost && https && port) rec.add(id, "pass", text);
    else rec.add(id, "fail", `${text}; expected https on ${host}`);
  } catch (error) {
    const { status, code } = classifyNetworkError(error);
    rec.add(id, status, `GET http://${host}/ failed (${code})`);
  }
}

export async function checkHttpsPage(
  host: string,
  page: HttpsPage,
  expected: HeaderExpectations,
  timeoutMs: number,
  rec: Recorder,
  responses: ResponseRecord[],
): Promise<void> {
  try {
    const result = await httpGet({ secure: true, host, path: page.path, timeoutMs });
    const label = `GET ${page.path}`;
    printResponse(label, result);
    responses.push({ label, ...result });
    const problems = result.status === 200 ? [] : [`status ${result.status}, expected 200`];
    problems.push(...headerProblems(result.headers, expected));
    if (problems.length > 0) rec.add(page.id, "fail", `${label}: ${problems.join("; ")}`);
    else rec.add(page.id, "pass", `${label} returned 200 with every required header`);
  } catch (error) {
    const { status, code } = classifyNetworkError(error);
    rec.add(page.id, status, `GET https://${host}${page.path} failed (${code})`);
  }
}
