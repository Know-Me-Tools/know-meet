/**
 * Reads the harness launch parameters (contract.md section 2) once.
 * `allowLinkOrigin` (repeatable) is an O-only extension: the explicit link-origin
 * allowlist. Without it, the configured DEFAULT_LINK_ORIGINS apply; there is no
 * allow-all default.
 */

export interface LaunchParams {
  readonly scenario: string;
  readonly agui: string;
  readonly session: string;
  readonly allowMediaOrigins: readonly string[];
  readonly allowLinkOrigins: readonly string[];
  readonly rate: string | null;
  readonly gap: string | null;
}

/** Configured link allowlist for the spike (Know Meet's own docs/meeting host). Product reads it from config. */
export const DEFAULT_LINK_ORIGINS: readonly string[] = ["https://know-me.tools"];

function origin(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function readLaunchParams(search: string): LaunchParams {
  const q = new URLSearchParams(search);
  const session = q.get("session") ?? `own-${Date.now().toString(36)}`;
  return {
    scenario: q.get("scenario") ?? "long-markdown",
    agui: (q.get("agui") ?? "http://127.0.0.1:4317").replace(/\/$/, ""),
    session,
    allowMediaOrigins: q.getAll("allowMediaOrigin").flatMap((o) => origin(o) ?? []),
    allowLinkOrigins: q.has("allowLinkOrigin") ? q.getAll("allowLinkOrigin").flatMap((o) => origin(o) ?? []) : DEFAULT_LINK_ORIGINS,
    rate: q.get("rate"),
    gap: q.get("gap"),
  };
}

/** POST target for every run of the session; keeps "/" in the scenario path. */
export function runEndpoint(p: LaunchParams): string {
  const query = new URLSearchParams({ session: p.session });
  if (p.rate !== null) query.set("rate", p.rate);
  if (p.gap !== null) query.set("gap", p.gap);
  return `${p.agui}/agui/${encodeURI(p.scenario)}?${query.toString()}`;
}
