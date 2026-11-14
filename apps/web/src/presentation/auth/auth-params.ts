// TJ-ARCH-MOB-001 compliant
// Hash parameters carried between the auth states (`#sign-up?email=…&next=…`).
// `email` and `name` are opaque display strings. `next` is a post-sign-in
// destination, so it is restricted to internal route names (auth-next.ts).
import { toHash } from "../shared/use-hash-route";
import { safeNext } from "./auth-next";

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
  if (params["next"]) out.next = safeNext(params["next"]);
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
