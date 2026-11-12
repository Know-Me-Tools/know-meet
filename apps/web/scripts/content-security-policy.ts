// TJ-ARCH-MOB-001 compliant
// One Content-Security-Policy for the web build (meta tag) and the Tauri host
// (app.security.csp, merged by apps/desktop/scripts/tauri-cli.ts). Node runs this
// file directly (type stripping), so it uses erasable TypeScript only.
// Hosted HTTP serving also sends buildContentSecurityPolicyHeader() as a response
// header, which adds the header-only frame-ancestors directive.

/** Public LiveKit server URL (wss://…). Not a secret; API key/secret never reach clients. */
export const LIVEKIT_URL_ENV = "KM_LIVEKIT_URL";

/**
 * Comma-separated bare https origins that agent-rendered media (images, video,
 * audio) may load from. Added to `img-src` and `media-src`. Public, not a secret.
 * Dev-only exception: http://127.0.0.1[:port] and http://localhost[:port].
 */
export const MEDIA_ORIGINS_ENV = "KM_MEDIA_ORIGINS";

// CSP notes (spikes/agentic-ui/measurements/csp-16-5.md):
// - No 'unsafe-eval' in script-src. zod 4 probes `Function("")` once per page load;
//   the probe is wrapped in try/catch, so the CSP `eval` violation report it raises
//   is harmless: zod falls back to its non-JIT path with no functional effect.
// - font-src stays 'self' with no `data:`. KaTeX fonts are self-hosted files, never
//   inlined into CSS as data: URIs.

type Directives = ReadonlyArray<readonly [string, readonly string[]]>;

/** `ipc:` and `http://ipc.localhost` are the Tauri IPC origins; inert in a browser. */
const BASE_DIRECTIVES: Directives = [
  ["default-src", ["'self'"]],
  ["script-src", ["'self'"]],
  ["style-src", ["'self'", "'unsafe-inline'"]],
  ["img-src", ["'self'", "data:"]],
  ["media-src", ["'self'"]],
  ["font-src", ["'self'"]],
  ["connect-src", ["'self'", "ipc:", "http://ipc.localhost"]],
  // Hardening (c13 security review L3): no <base> rewriting, forms post only to
  // this origin, no plugins. All three are valid in a <meta> CSP and in Tauri's.
  ["base-uri", ["'none'"]],
  ["form-action", ["'self'"]],
  ["object-src", ["'none'"]],
];

/**
 * Header-only directives. Browsers ignore `frame-ancestors` in a <meta> CSP, and
 * the Tauri webview is never framed, so it is not part of the shared policy.
 */
const HEADER_ONLY_DIRECTIVES: Directives = [["frame-ancestors", ["'none'"]]];

/**
 * Origins the LiveKit client needs: the wss signalling origin and the https origin
 * of the same host (LiveKit Cloud region discovery, `GET /settings/regions`).
 * Rejects anything but a bare wss origin so no token or credential can be baked
 * into the bundle through the URL.
 */
export function livekitOrigins(url: string | undefined): string[] {
  if (url === undefined || url.trim() === "") return [];
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error(`${LIVEKIT_URL_ENV} is not a valid URL`);
  }
  if (parsed.protocol !== "wss:") throw new Error(`${LIVEKIT_URL_ENV} must use wss://`);
  if (
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error(`${LIVEKIT_URL_ENV} must be a bare origin (no credentials, query or fragment)`);
  }
  return [`wss://${parsed.host}`, `https://${parsed.host}`];
}

const MEDIA_ORIGIN_PATTERN = /^(https?):\/\/([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?::(\d{1,5}))?$/;
const DEV_MEDIA_HOSTS: ReadonlySet<string> = new Set(["127.0.0.1", "localhost"]);

/**
 * Parses KM_MEDIA_ORIGINS. Each entry must be a bare origin: `https://host[:port]`,
 * or `http://127.0.0.1[:port]` / `http://localhost[:port]` for development. Paths,
 * queries, fragments, credentials, wildcards, other schemes and empty list entries
 * throw. Returns lowercase, de-duplicated origins in first-seen order.
 */
export function mediaOrigins(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim() === "") return [];
  const origins: string[] = [];
  for (const entry of raw.split(",")) {
    const value = entry.trim();
    if (value === "") throw new Error(`${MEDIA_ORIGINS_ENV} has an empty entry`);
    if (value.includes("*"))
      throw new Error(`${MEDIA_ORIGINS_ENV} must not contain wildcards: ${value}`);
    const match = MEDIA_ORIGIN_PATTERN.exec(value.toLowerCase());
    if (match === null) {
      throw new Error(
        `${MEDIA_ORIGINS_ENV} entry must be a bare origin (scheme://host[:port]): ${value}`,
      );
    }
    const [, scheme, host, port] = match;
    if (scheme === "http" && !DEV_MEDIA_HOSTS.has(host as string)) {
      throw new Error(
        `${MEDIA_ORIGINS_ENV} entry must use https:// (http only for 127.0.0.1 or localhost): ${value}`,
      );
    }
    if (port !== undefined && Number(port) > 65535) {
      throw new Error(`${MEDIA_ORIGINS_ENV} entry has an invalid port: ${value}`);
    }
    const origin = `${scheme}://${host}${port === undefined ? "" : `:${port}`}`;
    if (!origins.includes(origin)) origins.push(origin);
  }
  return origins;
}

export interface ContentSecurityPolicyInput {
  readonly livekitUrl: string | undefined;
  readonly mediaOrigins?: string | undefined;
}

export function buildContentSecurityPolicy(input: ContentSecurityPolicyInput): string {
  const extraConnect = livekitOrigins(input.livekitUrl);
  const extraMedia = mediaOrigins(input.mediaOrigins);
  return BASE_DIRECTIVES.map(([name, sources]) => {
    const all =
      name === "connect-src"
        ? [...sources, ...extraConnect]
        : name === "img-src" || name === "media-src"
          ? [...sources, ...extraMedia]
          : sources;
    return `${name} ${all.join(" ")}`;
  }).join("; ");
}

/**
 * The policy for a `Content-Security-Policy` HTTP response header: the shared
 * policy plus header-only directives (`frame-ancestors 'none'`, anti-clickjacking).
 *
 * Where it must be applied: any server that hosts the built web app (`apps/web/dist`)
 * over HTTP must send this header on every HTML response — the hosted Axum static
 * server, a CDN or a reverse proxy. The <meta> tag the build embeds cannot carry
 * `frame-ancestors`. The Tauri host does not need it (it uses `app.security.csp`).
 */
export function buildContentSecurityPolicyHeader(input: ContentSecurityPolicyInput): string {
  const headerOnly = HEADER_ONLY_DIRECTIVES.map(
    ([name, sources]) => `${name} ${sources.join(" ")}`,
  ).join("; ");
  return `${buildContentSecurityPolicy(input)}; ${headerOnly}`;
}
