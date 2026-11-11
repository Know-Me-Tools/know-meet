// TJ-ARCH-MOB-001 compliant
// DESIGN.md "Adaptive layout" (D-8): three width classes from the window tokens,
// never literals. `bar` < window-medium (600), `rail` < window-expanded (1024),
// `inline` otherwise. The bounds are read from the generated CSS custom
// properties (`--window-medium`, `--window-expanded`) so web, Tauri and Flutter
// share one source (docs/design/tokens.json).

export type WidthClass = "bar" | "rail" | "inline";

export interface WidthClassQueries {
  readonly medium: MediaQueryList;
  readonly expanded: MediaQueryList;
}

function readTokenPx(view: Window, name: string): string {
  const value = view.getComputedStyle(view.document.documentElement).getPropertyValue(name).trim();
  if (value === "") throw new Error(`Design token ${name} is not defined (tokens.css not loaded)`);
  return value;
}

export function createWidthClassQueries(view: Window): WidthClassQueries {
  return {
    medium: view.matchMedia(`(min-width: ${readTokenPx(view, "--window-medium")})`),
    expanded: view.matchMedia(`(min-width: ${readTokenPx(view, "--window-expanded")})`),
  };
}

export function widthClassOf(queries: WidthClassQueries): WidthClass {
  if (queries.expanded.matches) return "inline";
  if (queries.medium.matches) return "rail";
  return "bar";
}
