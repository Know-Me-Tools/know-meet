// TJ-ARCH-MOB-001 compliant
// Hash parameters carried between the auth states (`#sign-up?email=…&next=…`).
// Values are opaque display strings; `next` is passed through untouched because
// sign-in itself is not wired in this phase (contract exclusion: no real auth).
import { toHash } from "../shared/use-hash-route";

export type AuthView = "sign-in" | "sign-in-error" | "sign-up" | "check-email" | "magic-link-sent";

export interface AuthParams {
  readonly email?: string;
  readonly name?: string;
  readonly next?: string;
}

export function authParams(params: Readonly<Record<string, string>>): AuthParams {
  const out: { email?: string; name?: string; next?: string } = {};
  if (params["email"]) out.email = params["email"];
  if (params["name"]) out.name = params["name"];
  if (params["next"]) out.next = params["next"];
  return out;
}

/** `#view?…` with the non-empty params only. */
export function authHash(view: AuthView, params: AuthParams = {}): string {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value !== "") query[key] = value;
  }
  return Object.keys(query).length === 0 ? view : toHash(view, undefined, query);
}
