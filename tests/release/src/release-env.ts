/**
 * Run inputs for the release suite. Every value comes from the environment of
 * the boundary run; none is a secret. A missing required input fails the test
 * that needs it with a message starting "BLOCKED:", so a run can never pass by
 * silently skipping an adopted scenario.
 */
import { readFileSync } from "node:fs";

export const ENV = {
  baseUrl: "KM_RELEASE_BASE_URL",
  staticUrl: "KM_RELEASE_STATIC_URL",
  defaultBuildUrl: "KM_RELEASE_DEFAULT_BUILD_URL",
  cspFile: "KM_RELEASE_CSP_FILE",
  tokenTtlSeconds: "KM_RELEASE_TOKEN_TTL_SECONDS",
  rateLimitBurst: "KM_RELEASE_RATE_LIMIT_BURST",
  rateLimitRefillSeconds: "KM_RELEASE_RATE_LIMIT_REFILL_SECONDS",
  imageDigests: "KM_RELEASE_IMAGE_DIGESTS",
  evidenceDir: "KM_EVIDENCE_DIR",
} as const;

export const PACKAGED_BASE_URL_DEFAULT = "http://localhost:8080";
export const HOSTED_BASE_URL = "https://meet.know-me.tools";
/** Vite preview of the default build, as the fidelity suite serves it. */
export const DEFAULT_BUILD_URL_DEFAULT = "http://127.0.0.1:4173";

function read(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? undefined : value.trim();
}

export function blocked(what: string): Error {
  return new Error(`BLOCKED: ${what}`);
}

function required(name: string, purpose: string): string {
  const value = read(name);
  if (value === undefined) throw blocked(`${name} is not set (${purpose})`);
  return value;
}

function positiveInteger(name: string, purpose: string): number {
  const raw = required(name, purpose);
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw blocked(`${name} must be a positive integer (${purpose}); got "${raw}"`);
  }
  return value;
}

/** The packaged static image alone, without proxy or Gateway (WR-3 negative control). */
export function staticImageUrl(fallback: string): string {
  return read(ENV.staticUrl) ?? fallback;
}

/** The default (non-hosted) web build of the same commit (WR-5 negative control). */
export function defaultBuildUrl(): string {
  return read(ENV.defaultBuildUrl) ?? DEFAULT_BUILD_URL_DEFAULT;
}

/** The Content-Security-Policy header value written by build:hosted (wr06 task 6.3). */
export function expectedCsp(): string {
  const path = required(ENV.cspFile, "path of the CSP header artifact written by build:hosted");
  const value = readFileSync(path, "utf8").trim();
  if (value === "") throw blocked(`${path} is empty`);
  return value;
}

export interface AbuseLimits {
  readonly tokenTtlSeconds: number;
  readonly burst: number;
  readonly refillSeconds: number;
}

/** Token lifetime and per-client limit, read from the deployed configuration by the runner. */
export function abuseLimits(): AbuseLimits {
  const purpose = "read from the deployed token-service configuration";
  return {
    tokenTtlSeconds: positiveInteger(ENV.tokenTtlSeconds, purpose),
    burst: positiveInteger(ENV.rateLimitBurst, purpose),
    refillSeconds: positiveInteger(ENV.rateLimitRefillSeconds, purpose),
  };
}

/** Image digests of the run, recorded with WR-1 evidence. Optional input, recorded as given. */
export function imageDigests(): string {
  return read(ENV.imageDigests) ?? "not provided";
}
