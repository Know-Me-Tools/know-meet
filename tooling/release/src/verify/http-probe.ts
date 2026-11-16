/**
 * One plain GET over http (port 80) or https (port 443), headers only. Redirects are
 * never followed. The response body is never read: the response is destroyed as soon as
 * its headers arrive. `Set-Cookie` values are dropped (only a count is kept).
 *
 * https requests use `rejectUnauthorized: false` on purpose: the certificate is judged
 * by its own checks (tls-*), so a certificate problem cannot hide a header problem.
 * Nothing sensitive is sent: a GET with a fixed user agent and no credentials.
 */
import { type IncomingHttpHeaders, type IncomingMessage, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

import { ProbeError } from "./probe-error.ts";
import { printable } from "./report.ts";

export interface HttpResult {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly cookieCount: number;
}

export interface HttpRequest {
  readonly secure: boolean;
  readonly host: string;
  readonly path: string;
  readonly timeoutMs: number;
}

const HEADER_VALUE_LIMIT = 4096;
const REQUEST_HEADERS = {
  accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  "user-agent": "know-meet-verify-endpoint/1",
  connection: "close",
};

function readHeaders(raw: IncomingHttpHeaders): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(raw)) {
    if (name === "set-cookie" || value === undefined) continue;
    headers[name] = typeof value === "string" ? value : value.join(", ");
  }
  return headers;
}

function cookieCountOf(raw: IncomingHttpHeaders): number {
  const cookies = raw["set-cookie"];
  return cookies === undefined ? 0 : cookies.length;
}

export function httpGet(options: HttpRequest): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const onResponse = (res: IncomingMessage): void => {
      clearTimeout(timer);
      resolve({
        status: res.statusCode ?? 0,
        headers: readHeaders(res.headers),
        cookieCount: cookieCountOf(res.headers),
      });
      res.destroy();
    };
    const common = {
      host: options.host,
      path: options.path,
      method: "GET",
      headers: REQUEST_HEADERS,
      agent: false,
    };
    const req = options.secure
      ? httpsRequest(
          { ...common, port: 443, servername: options.host, rejectUnauthorized: false },
          onResponse,
        )
      : httpRequest({ ...common, port: 80 }, onResponse);
    const timer = setTimeout(() => {
      req.destroy(new ProbeError("PROBE_TIMEOUT", "request timed out"));
    }, options.timeoutMs);
    req.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    req.end();
  });
}

/** Prints the response headers for the evidence log. Set-Cookie is never printed. */
export function printResponse(label: string, result: HttpResult): void {
  const cookies = `set-cookie-headers=${result.cookieCount} (values not shown)`;
  process.stdout.write(`RESPONSE ${label} status=${result.status} ${cookies}\n`);
  const names = Object.keys(result.headers).sort();
  for (const name of names) {
    const value = printable(result.headers[name] ?? "", HEADER_VALUE_LIMIT);
    process.stdout.write(`HEADER ${label} ${name}: ${value}\n`);
  }
}
