/**
 * Tells Let's Encrypt production from staging by the issuer fields of the certificate
 * the server presents. Source: letsencrypt.org/docs/staging-environment and
 * letsencrypt.org/certificates, read 2026-11-15.
 *
 * Facts used:
 *  - Production leaf certificates are issued by an intermediate whose Organization is
 *    "Let's Encrypt" (CN R10 to R14, E5 to E9, or YE1 to YE3 and YR1 to YR3).
 *  - Every staging root and intermediate carries "(STAGING)" in its Common Name, and the
 *    staging roots are not in any public trust store.
 * So: staging when "(STAGING)" appears anywhere in the presented issuer names; production
 * when the leaf issuer's Organization is "Let's Encrypt", no name is marked staging, and
 * Node's own root store trusts the chain. Intermediate CN values are NOT pinned: Let's
 * Encrypt rotates them and says they must not be pinned.
 */

export type IssuerClass = "production" | "staging" | "other";

export interface IssuerFacts {
  /** Organization of the leaf's issuer, for example "Let's Encrypt". */
  readonly issuerOrganization: string | undefined;
  /** Every issuer Organization and Common Name seen on the presented chain. */
  readonly chainNames: readonly string[];
  /** Whether Node's root store verified the chain and the host name. */
  readonly trusted: boolean;
}

const STAGING_MARKER = /\(staging\)/i;

/** Certificates use an ASCII apostrophe; some tooling prints a typographic one. */
function plain(text: string | undefined): string {
  return (text ?? "").replace(/[‘’]/g, "'").trim();
}

export function readsAsLetsEncrypt(organization: string | undefined): boolean {
  return plain(organization) === "Let's Encrypt";
}

export function classifyIssuer(facts: IssuerFacts): IssuerClass {
  if (facts.chainNames.some((name) => STAGING_MARKER.test(name))) return "staging";
  return readsAsLetsEncrypt(facts.issuerOrganization) && facts.trusted ? "production" : "other";
}
