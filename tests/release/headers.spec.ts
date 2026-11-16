/**
 * WR-3 Valid TLS and security headers at the public URL
 * (features/wr-3-tls-and-headers.feature).
 * - Positive scenario: hosted project only (@hosted-only). TLS is checked with
 *   node:tls against the system trust store, so a staging or self-signed
 *   certificate fails.
 * - Negative control: packaged project only (@packaged-only). The same header
 *   assertions against the bare static image must report the missing HSTS.
 */
import { connect, type PeerCertificate } from "node:tls";
import { expect, test } from "@playwright/test";
import { API } from "./src/api-contract.ts";
import { attachJson } from "./src/evidence.ts";
import { HSTS, headerProblems } from "./src/header-checks.ts";
import { expectedCsp, staticImageUrl } from "./src/release-env.ts";

const TLS_TIMEOUT_MS = 15_000;
const LETS_ENCRYPT_PRODUCTION_ORG = "Let's Encrypt";

interface TlsObservation {
  readonly authorized: boolean;
  readonly authorizationError: string | null;
  readonly issuerOrganisation: string;
  readonly issuerCommonName: string;
  readonly validFrom: string;
  readonly validTo: string;
  readonly subjectAltName: string;
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function observeTls(host: string): Promise<TlsObservation> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port: 443, servername: host, rejectUnauthorized: false });
    socket.setTimeout(TLS_TIMEOUT_MS, () => {
      socket.destroy();
      reject(new Error(`TLS connection to ${host}:443 timed out`));
    });
    socket.once("error", reject);
    socket.once("secureConnect", () => {
      const cert: PeerCertificate = socket.getPeerCertificate();
      const error = socket.authorizationError;
      resolve({
        authorized: socket.authorized,
        authorizationError: error === null ? null : String(error),
        issuerOrganisation: first(cert.issuer?.O),
        issuerCommonName: first(cert.issuer?.CN),
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        subjectAltName: cert.subjectaltname ?? "",
      });
      socket.end();
    });
  });
}

test.describe("WR-3 Valid TLS and security headers at the public URL", () => {
  test(
    "the public URL has a production certificate, an HTTPS redirect and the security headers",
    { tag: ["@WR-3", "@value-critical", "@hosted-only"] },
    async ({ request, baseURL }, testInfo) => {
      const site = new URL(baseURL ?? "");
      const csp = expectedCsp();

      const tls = await observeTls(site.hostname);
      await attachJson(testInfo, "wr-3-certificate.json", tls);
      expect(tls.authorized, `certificate chain trusted (${tls.authorizationError})`).toBe(true);
      expect(tls.issuerOrganisation, "issuer organisation").toBe(LETS_ENCRYPT_PRODUCTION_ORG);
      const now = Date.now();
      expect(Date.parse(tls.validFrom), "certificate already valid").toBeLessThanOrEqual(now);
      expect(Date.parse(tls.validTo), "certificate not expired").toBeGreaterThan(now);
      expect(tls.subjectAltName, "certificate names the host").toContain(`DNS:${site.hostname}`);

      const plain = await request.get(`http://${site.hostname}/`, {
        maxRedirects: 0,
        failOnStatusCode: false,
      });
      const location = plain.headers()["location"] ?? "";
      await attachJson(testInfo, "wr-3-redirect.json", { status: plain.status(), location });
      expect([301, 302, 307, 308], "HTTP answers with a redirect").toContain(plain.status());
      expect(location, "redirect target").toBe(`https://${site.hostname}/`);

      const dump: Record<string, unknown> = {};
      const problems: string[] = [];
      for (const path of ["/", API.health]) {
        const response = await request.get(path, { failOnStatusCode: false });
        const headers = response.headers();
        dump[path] = { status: response.status(), headers };
        expect(response.status(), `GET ${path} status`).toBe(200);
        problems.push(
          ...headerProblems(headers, { csp, origin: site.origin }).map((p) => `${path} ${p}`),
        );
      }
      await attachJson(testInfo, "wr-3-header-dump.json", dump);
      expect(problems, "security header problems").toEqual([]);
    },
  );

  test(
    "the same header assertions fail for HSTS on the bare static image",
    { tag: ["@WR-3", "@negative-control", "@packaged-only"] },
    async ({ request, baseURL }, testInfo) => {
      const target = new URL("/", staticImageUrl(baseURL ?? ""));
      const csp = expectedCsp();
      const response = await request.get(target.href, { failOnStatusCode: false });
      const headers = response.headers();
      const problems = headerProblems(headers, { csp, origin: target.origin });
      await attachJson(testInfo, "wr-3-negative.json", {
        target: target.href,
        status: response.status(),
        headers,
        problems,
      });
      expect(response.status(), "the static image serves /").toBe(200);
      expect(headers[HSTS], "no HSTS without the Gateway filter").toBeUndefined();
      expect(
        problems.some((p) => p.startsWith(`${HSTS}:`)),
        "the header assertions report the HSTS failure",
      ).toBe(true);
    },
  );
});
