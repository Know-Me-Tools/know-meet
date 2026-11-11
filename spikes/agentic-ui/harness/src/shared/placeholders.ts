/** Origin placeholders used in the corpus and their substitution. */

export interface Origins {
  /** Mock server origin; serves /media/* and is on the prototype's media allowlist. */
  readonly allowed: string;
  /** Second listener; any request it receives is a failure. */
  readonly evil: string;
}

/** Mock server port (env KM_HARNESS_PORT) and the evil listener (KM_HARNESS_EVIL_PORT, default port + 1). */
export const DEFAULT_PORTS = { mock: 4317, evil: 4318 } as const;

export const DEFAULT_ORIGINS: Origins = {
  allowed: `http://127.0.0.1:${DEFAULT_PORTS.mock}`,
  evil: `http://127.0.0.1:${DEFAULT_PORTS.evil}`,
};

export function substituteText(text: string, origins: Origins): string {
  return text.replaceAll("{{ALLOWED_ORIGIN}}", origins.allowed).replaceAll("{{EVIL_ORIGIN}}", origins.evil);
}

/** Deep substitution through any JSON value (returns a new value). */
export function substituteJson<T>(value: T, origins: Origins): T {
  const text = JSON.stringify(value);
  const replaced = substituteText(text, origins);
  const parsed: T = JSON.parse(replaced);
  return parsed;
}
