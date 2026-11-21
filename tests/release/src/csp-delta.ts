/**
 * WC-10: the hosted Content-Security-Policy may differ from the previous one
 * only by the sources the adopted contract names (analysis.md table, decision
 * "Adopt CSP"). Everything else is a widening and fails.
 */

export type ParsedCsp = ReadonlyMap<string, readonly string[]>;

export interface CspChange {
  readonly directive: string;
  readonly added: readonly string[];
  readonly removed: readonly string[];
}

/**
 * The sources the web-only change may add, per directive. worker-src is a new
 * directive (it fell back to script-src); 'self' blob: is the start value, and
 * wc07 may narrow it to 'self'. img-src blob: is "to confirm" in the analysis.
 */
export const ADOPTED_ADDITIONS: Readonly<Record<string, readonly string[]>> = {
  "script-src": ["'wasm-unsafe-eval'"],
  "worker-src": ["'self'", "blob:"],
  "media-src": ["blob:"],
  "img-src": ["blob:"],
};

/** The sources that must not appear in the default (desktop-shared) policy. */
export const NEW_SOURCE_TOKENS: readonly string[] = ["'wasm-unsafe-eval'", "blob:"];

export function parseCsp(value: string): ParsedCsp {
  const out = new Map<string, readonly string[]>();
  for (const part of value.split(";")) {
    const tokens = part
      .trim()
      .split(/\s+/)
      .filter((t) => t !== "");
    const [name, ...sources] = tokens;
    if (name !== undefined) out.set(name.toLowerCase(), sources);
  }
  return out;
}

/** Directive order and source order do not change a policy; this form compares policies. */
export function canonicalCsp(value: string): string {
  return [...parseCsp(value)]
    .map(([name, sources]) => [name, ...[...sources].sort()].join(" "))
    .sort()
    .join("; ");
}

export function diffCsp(previous: string, next: string): CspChange[] {
  const before = parseCsp(previous);
  const after = parseCsp(next);
  const names = new Set([...before.keys(), ...after.keys()]);
  const changes: CspChange[] = [];
  for (const directive of [...names].sort()) {
    const was = new Set(before.get(directive) ?? []);
    const is = new Set(after.get(directive) ?? []);
    const added = [...is].filter((token) => !was.has(token));
    const removed = [...was].filter((token) => !is.has(token));
    if (added.length > 0 || removed.length > 0) changes.push({ directive, added, removed });
  }
  return changes;
}

/**
 * Every change outside the adoption: a removed source, an added source the
 * contract does not name, or a change to a directive it does not name.
 * Narrowing worker-src (wc07) shows as a smaller addition and passes.
 */
export function unadoptedChanges(changes: readonly CspChange[]): string[] {
  const problems: string[] = [];
  for (const change of changes) {
    const allowed = ADOPTED_ADDITIONS[change.directive];
    if (allowed === undefined) {
      problems.push(
        `${change.directive}: not an adopted directive (+${change.added.join(" ")} -${change.removed.join(" ")})`,
      );
      continue;
    }
    for (const token of change.added) {
      if (!allowed.includes(token)) problems.push(`${change.directive}: adds ${token}`);
    }
    for (const token of change.removed) problems.push(`${change.directive}: removes ${token}`);
  }
  return problems;
}

/** The new sources found anywhere in a policy (empty for the default policy). */
export function newSourcesIn(policy: string): string[] {
  const found: string[] = [];
  for (const [directive, sources] of parseCsp(policy)) {
    for (const token of sources) {
      if (NEW_SOURCE_TOKENS.includes(token)) found.push(`${directive} ${token}`);
    }
  }
  return found;
}

/** The content of the Content-Security-Policy meta tag of an HTML document, or null. */
export function metaCsp(html: string): string | null {
  const tag = /<meta\s+[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i.exec(html);
  if (tag === null) return null;
  const content = /content=("([^"]*)"|'([^']*)')/i.exec(tag[0]);
  return content === null ? null : (content[2] ?? content[3] ?? null);
}

/** The desktop policy at the base commit (apps/desktop/src-tauri/tauri.conf.json), byte for byte. */
export const DESKTOP_CSP_GOLDEN =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self' ipc: http://ipc.localhost; base-uri 'none'; form-action 'self'; object-src 'none'";
