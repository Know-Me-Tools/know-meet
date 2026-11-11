/** URL parameters the harness launches the prototype with (contract.md §2). Read once on mount. */

export interface LaunchParams {
  readonly scenario: string;
  readonly aguiBase: string;
  readonly session: string;
  readonly allowMediaOrigins: readonly string[];
  readonly pacing: Readonly<Record<string, string>>;
}

const PACING_KEYS = ["rate", "gap"] as const;

function originOf(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function readLaunchParams(search: string): LaunchParams {
  const params = new URLSearchParams(search);
  const pacing: Record<string, string> = {};
  for (const key of PACING_KEYS) {
    const value = params.get(key);
    if (value !== null) pacing[key] = value;
  }
  const allowMediaOrigins = params.getAll("allowMediaOrigin").flatMap((o) => {
    const origin = originOf(o);
    return origin === null ? [] : [origin];
  });
  return {
    scenario: params.get("scenario") ?? "long-markdown",
    aguiBase: (params.get("agui") ?? "http://127.0.0.1:4317").replace(/\/+$/, ""),
    session: params.get("session") ?? `local-${Date.now().toString(36)}`,
    allowMediaOrigins,
    pacing,
  };
}

/** `POST {agui}/agui/{scenario}?session=..` with `/` kept in the scenario path (encodeURI). */
export function runEndpoint(p: LaunchParams): string {
  const query = new URLSearchParams({ session: p.session, ...p.pacing });
  return `${p.aguiBase}/agui/${encodeURI(p.scenario)}?${query.toString()}`;
}
