// TJ-ARCH-MOB-001 compliant
// The Content-Security-Policy response-header value of the hosted build, written as
// a file. The Gateway sets the header from this file, and the release suite reads it
// through KM_RELEASE_CSP_FILE, so the header, the <meta> tag and the tests share one
// source: buildContentSecurityPolicyHeader.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { BuildInputs } from "./build-mode.ts";
import { buildContentSecurityPolicyHeader } from "./content-security-policy.ts";

/** Artifact path relative to apps/web. Outside dist-hosted, so it is never served as a page asset. */
export const CSP_ARTIFACT_FILE = "dist-hosted-csp.txt";

/** The exact header value for the hosted inputs. */
export function hostedContentSecurityPolicyHeader(inputs: BuildInputs): string {
  return buildContentSecurityPolicyHeader({
    livekitUrl: inputs.livekitUrl,
    mediaOrigins: inputs.mediaOrigins,
  });
}

export function removeCspArtifact(path: string): void {
  rmSync(path, { force: true });
}

/** Writes the value exactly as given: no trailing newline, so a header reader needs no trim. */
export function writeCspArtifact(path: string, header: string): void {
  if (header.trim() === "") throw new Error("Refusing to write an empty CSP header artifact");
  if (/[\r\n]/.test(header)) throw new Error("A CSP header value must be a single line");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, header, "utf8");
}
