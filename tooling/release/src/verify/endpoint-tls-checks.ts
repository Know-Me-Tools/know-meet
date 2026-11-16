/**
 * The DNS and TLS checks of verify-endpoint: the name resolves, the certificate names the
 * host and is inside its validity period, its issuer is Let's Encrypt production (staging
 * is reported, and only tolerated with --allow-staging), and the chain is trusted.
 */
import { lookup } from "node:dns/promises";

import { classifyIssuer, type IssuerClass, readsAsLetsEncrypt } from "./issuer.ts";
import { classifyNetworkError, ProbeError } from "./probe-error.ts";
import type { Recorder } from "./report.ts";
import { probeTls, type TlsFacts } from "./tls-probe.ts";

const DAY_MS = 86_400_000;

async function lookupAll(host: string, timeoutMs: number): Promise<string[]> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    const expire = (): void => reject(new ProbeError("PROBE_TIMEOUT", "lookup timed out"));
    timer = setTimeout(expire, timeoutMs);
  });
  try {
    const found = await Promise.race([lookup(host, { all: true }), timeout]);
    return found.map((entry) => entry.address);
  } finally {
    clearTimeout(timer);
  }
}

/** True when the name resolved. Any other result means later network checks are not run. */
export async function checkDns(host: string, timeoutMs: number, rec: Recorder): Promise<boolean> {
  try {
    const addresses = await lookupAll(host, timeoutMs);
    if (addresses.length === 0) {
      rec.add("dns", "fail", `${host} resolves to no address`);
      return false;
    }
    rec.add("dns", "pass", `${host} resolves to ${addresses.join(", ")}`);
    return true;
  } catch (error) {
    const { status, code } = classifyNetworkError(error);
    rec.add("dns", status, `${host} did not resolve (${code})`);
    return false;
  }
}

function checkValidity(facts: TlsFacts, rec: Recorder): void {
  const now = Date.now();
  if (Number.isNaN(facts.validFromMs) || Number.isNaN(facts.validToMs)) {
    rec.add("tls-validity", "fail", "certificate validity dates could not be read");
  } else if (now < facts.validFromMs) {
    const from = new Date(facts.validFromMs).toISOString();
    rec.add("tls-validity", "fail", `not valid before ${from}`);
  } else if (now > facts.validToMs) {
    rec.add("tls-validity", "fail", `expired at ${new Date(facts.validToMs).toISOString()}`);
  } else {
    const days = Math.floor((facts.validToMs - now) / DAY_MS);
    const until = new Date(facts.validToMs).toISOString();
    rec.add("tls-validity", "pass", `valid until ${until} (${days} days left)`);
  }
}

function issuerText(facts: TlsFacts): string {
  const organization = facts.issuerOrganization ?? "?";
  return `issuer O=${organization} CN=${facts.issuerCommonName ?? "?"}`;
}

function checkIssuer(facts: TlsFacts, allowStaging: boolean, rec: Recorder): IssuerClass {
  const kind = classifyIssuer(facts);
  const text = issuerText(facts);
  if (kind === "production") {
    rec.add("tls-issuer", "pass", `${text} (Let's Encrypt production)`);
  } else if (kind === "staging") {
    const note = allowStaging ? "allowed by --allow-staging" : "the production issuer is required";
    rec.add("tls-issuer", allowStaging ? "info" : "fail", `${text} is STAGING; ${note}`);
  } else if (readsAsLetsEncrypt(facts.issuerOrganization)) {
    const why = facts.authorizationError ?? "unknown";
    const note = "reads as Let's Encrypt but the chain is not trusted";
    rec.add("tls-issuer", "fail", `${text} ${note} (${why})`);
  } else {
    rec.add("tls-issuer", "fail", `${text} is not Let's Encrypt`);
  }
  return kind;
}

function checkTrust(
  facts: TlsFacts,
  kind: IssuerClass,
  allowStaging: boolean,
  rec: Recorder,
): void {
  if (facts.trusted) {
    const text = `chain verified for the host by Node's root store (${facts.protocol})`;
    rec.add("tls-chain-trusted", "pass", text);
    return;
  }
  const why = facts.authorizationError ?? "unknown";
  const expected = kind === "staging" && allowStaging;
  const note = expected ? "expected for a staging certificate" : "the chain is not trusted";
  rec.add("tls-chain-trusted", expected ? "info" : "fail", `${note} (${why})`);
}

export async function checkTls(
  host: string,
  allowStaging: boolean,
  timeoutMs: number,
  rec: Recorder,
): Promise<void> {
  let facts: TlsFacts;
  try {
    facts = await probeTls(host, timeoutMs);
  } catch (error) {
    const { status, code } = classifyNetworkError(error);
    rec.add("tls-handshake", status, `TLS handshake with ${host}:443 failed (${code})`);
    return;
  }
  const names = facts.subjectAltName === "" ? "no subject alternative names" : facts.subjectAltName;
  rec.add("tls-certificate", "info", `${names}; sha256 ${facts.fingerprint256}`);
  if (facts.identityError === null) rec.add("tls-identity", "pass", `certificate names ${host}`);
  else rec.add("tls-identity", "fail", `${facts.identityError}: ${host}`);
  checkValidity(facts, rec);
  checkTrust(facts, checkIssuer(facts, allowStaging, rec), allowStaging, rec);
}
