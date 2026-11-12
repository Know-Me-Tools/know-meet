// TJ-ARCH-MOB-001 compliant
// The post-sign-in destination carried in `#sign-in?next=…`. It is user-controlled
// (anyone can craft the link), so only internal route names are accepted, with an
// optional hash sub-state (`agents#detail:iris`). Anything else, including absolute
// URLs, protocol-relative paths and `javascript:`, falls back to DEFAULT_NEXT.
// Pure and import-free so node:test can load it directly.

/** Signed-in routes a sign-in may return to (paths under app/router.tsx). */
export const NEXT_ROUTES: readonly string[] = [
  "dashboard",
  "agents",
  "recordings",
  "settings",
  "notes",
];

export const DEFAULT_NEXT = "dashboard";

/** Hash sub-state: `view`, `view:arg`, `view:arg?k=v` (shared/use-hash-route.ts toHash). */
const SUB_STATE = /^[A-Za-z0-9][A-Za-z0-9._:%=&?-]{0,255}$/;

/** Returns `value` when it is an allowed internal destination, else DEFAULT_NEXT. */
export function safeNext(value: string): string {
  const hashAt = value.indexOf("#");
  const route = hashAt === -1 ? value : value.slice(0, hashAt);
  if (!NEXT_ROUTES.includes(route)) return DEFAULT_NEXT;
  if (hashAt === -1) return value;
  return SUB_STATE.test(value.slice(hashAt + 1)) ? value : DEFAULT_NEXT;
}
