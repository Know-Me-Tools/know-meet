/**
 * One TLS handshake to host:443 and a read of the certificate the server presents.
 * The handshake runs with `rejectUnauthorized: false` so a certificate that fails
 * verification (a staging certificate always does) can still be read and judged; the
 * verification result is recorded in `trusted` and `authorizationError` instead.
 * Nothing is sent after the handshake.
 */
import { checkServerIdentity, connect, type PeerCertificate, type TLSSocket } from "node:tls";

import { ProbeError } from "./probe-error.ts";

export interface TlsFacts {
  readonly identityError: string | null;
  readonly subjectAltName: string;
  readonly validFromMs: number;
  readonly validToMs: number;
  readonly issuerOrganization: string | undefined;
  readonly issuerCommonName: string | undefined;
  readonly chainNames: readonly string[];
  readonly trusted: boolean;
  readonly authorizationError: string | null;
  readonly protocol: string;
  readonly fingerprint256: string;
}

/** A certificate attribute can be a string or, when repeated, an array of strings. */
function attribute(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

function chainNames(leaf: PeerCertificate): string[] {
  const names = [attribute(leaf.issuer.O), attribute(leaf.issuer.CN)];
  const next: PeerCertificate | undefined = leaf.issuerCertificate;
  if (next !== undefined && next !== leaf) {
    names.push(attribute(next.issuer.O), attribute(next.issuer.CN));
  }
  return names.filter((name): name is string => name !== undefined);
}

function readFacts(host: string, socket: TLSSocket): TlsFacts {
  const cert = socket.getPeerCertificate(true);
  const identity = checkServerIdentity(host, cert);
  return {
    identityError: identity === undefined ? null : "certificate does not name the host",
    subjectAltName: cert.subjectaltname ?? "",
    validFromMs: Date.parse(cert.valid_from),
    validToMs: Date.parse(cert.valid_to),
    issuerOrganization: attribute(cert.issuer.O),
    issuerCommonName: attribute(cert.issuer.CN),
    chainNames: chainNames(cert),
    trusted: socket.authorized,
    authorizationError: socket.authorized ? null : String(socket.authorizationError),
    protocol: socket.getProtocol() ?? "unknown",
    fingerprint256: cert.fingerprint256,
  };
}

export function probeTls(host: string, timeoutMs: number): Promise<TlsFacts> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port: 443, servername: host, rejectUnauthorized: false });
    const timer = setTimeout(() => {
      socket.destroy(new ProbeError("PROBE_TIMEOUT", "TLS handshake timed out"));
    }, timeoutMs);
    socket.once("secureConnect", () => {
      clearTimeout(timer);
      try {
        resolve(readFacts(host, socket));
      } catch (error) {
        reject(error);
      } finally {
        socket.destroy();
      }
    });
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
