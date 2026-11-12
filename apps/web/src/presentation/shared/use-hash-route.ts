// TJ-ARCH-MOB-001 compliant
// km.js `parseHash` / `route`: sub-states live in the URL hash as
// `#view`, `#view:arg` or `#view:arg?x=1&y=2` (app-state-map.json paths such as
// `/dashboard#meeting:pricing-review`). The router's location is the source, so
// `<Link hash>` and plain `href="#…"` anchors both update it. On every change after
// the first render the page scrolls to the top and focus moves to the page h1, so
// screen-reader and keyboard users land on the new view (km.js `focusHeading`).
import { useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";

export interface HashRoute {
  readonly view: string;
  readonly arg: string | null;
  readonly params: Readonly<Record<string, string>>;
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

export function parseHashRoute(hash: string): HashRoute {
  const raw = hash.replace(/^#/, "");
  const queryAt = raw.indexOf("?");
  const path = queryAt > -1 ? raw.slice(0, queryAt) : raw;
  const query = queryAt > -1 ? raw.slice(queryAt + 1) : "";
  const colonAt = path.indexOf(":");
  const view = decode(colonAt > -1 ? path.slice(0, colonAt) : path);
  const arg = colonAt > -1 ? decode(path.slice(colonAt + 1)) : null;
  const params: Record<string, string> = {};
  for (const pair of query.split("&")) {
    if (pair === "") continue;
    const equalsAt = pair.indexOf("=");
    const key = equalsAt > -1 ? pair.slice(0, equalsAt) : pair;
    params[decode(key)] = decode(equalsAt > -1 ? pair.slice(equalsAt + 1) : "");
  }
  return { view, arg, params };
}

function focusPageHeading(): void {
  const heading = document.querySelector<HTMLElement>("main h1");
  if (heading === null) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

/** The current hash sub-state; moves focus to the h1 when it changes. */
export function useHashRoute(): HashRoute {
  const hash = useLocation({ select: (location) => location.hash });
  const route = useMemo(() => parseHashRoute(hash), [hash]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    focusPageHeading();
  }, [hash]);
  return route;
}

/** Builds a hash for `<Link hash>`: `view`, `view:arg`, `view:arg?k=v`. */
export function toHash(view: string, arg?: string, params?: Readonly<Record<string, string>>): string {
  const path = arg === undefined ? view : `${view}:${arg}`;
  const query = params === undefined ? "" : new URLSearchParams(params).toString();
  return query === "" ? path : `${path}?${query}`;
}
