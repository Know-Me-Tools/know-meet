/**
 * Mock server configuration from the environment.
 *   KM_HARNESS_PORT (or PORT)  main listener, default 4317
 *   KM_HARNESS_EVIL_PORT       evil listener, default main port + 1
 *   KM_HARNESS_HOST            bind address, default 127.0.0.1
 */
import { DEFAULT_PORTS, type Origins } from "../shared/placeholders.ts";

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly evilPort: number;
}

function parsePort(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 65_535) {
    throw new Error(`${name} must be an integer port (0-65535), got "${raw}"`);
  }
  return value;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = parsePort(env["KM_HARNESS_PORT"] ?? env["PORT"], DEFAULT_PORTS.mock, "KM_HARNESS_PORT");
  const evilPort = parsePort(env["KM_HARNESS_EVIL_PORT"], port === 0 ? 0 : port + 1, "KM_HARNESS_EVIL_PORT");
  const host = env["KM_HARNESS_HOST"]?.trim() || "127.0.0.1";
  return { host, port, evilPort };
}

/** Origins the corpus placeholders resolve to once both listeners are bound. */
export function originsFor(host: string, port: number, evilPort: number): Origins {
  const h = host.includes(":") ? `[${host}]` : host;
  return { allowed: `http://${h}:${port}`, evil: `http://${h}:${evilPort}` };
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "tauri.localhost"]);

/**
 * CORS: any localhost origin (any port), Tauri's custom-protocol origins and
 * `null` (file:// pages). Everything else gets no CORS headers.
 */
export function isAllowedCorsOrigin(origin: string): boolean {
  if (origin === "null" || origin === "tauri://localhost") return true;
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" || url.protocol === "https:") && LOCAL_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}
