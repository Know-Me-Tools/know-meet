// Web CSS custom properties for both themes, in the prototype's shape: dark on
// :root (the default), light as overrides on [data-theme="light"], each key as
// --<prefix><key>. Used for the product (no prefix) and for the brand documents'
// docs/design/tokens.css (prefix km-, operator decision D-4).
import type { Category } from "../classify.ts";
import { type TokenSet, tokenValue } from "../tokens-json-adapter.ts";

export interface ThemeCssOptions {
  readonly header: readonly string[];
  readonly prefix: string;
  /** Emit key A with key B's value (brand hero keeps text-display-brand). */
  readonly valueAliases: Readonly<Record<string, string>>;
}

const LABELS: Readonly<Record<Category, string>> = {
  colour: "colour",
  shadow: "shadow",
  "font-family": "font family",
  "font-weight": "font weight",
  "font-size": "font size (px, em or fluid clamp)",
  leading: "line height",
  tracking: "letter spacing",
  space: "space (8px rhythm)",
  radius: "radius",
  layout: "layout",
  size: "component sizes (D-7)",
  measure: "text measures",
  window: "adaptive window classes (min-width; reference only, var() cannot be used in @media)",
  breakpoint: "breakpoints (max-width; reference only, var() cannot be used in @media)",
  "z-index": "z-index",
  duration: "motion durations",
  easing: "easing",
  gradient: "orb gradient geometry",
};

function block(
  tokens: TokenSet,
  theme: "dark" | "light",
  keys: readonly string[],
  options: ThemeCssOptions,
): string[] {
  const lines: string[] = [`  color-scheme: ${theme};`];
  let previous: Category | null = null;
  for (const key of keys) {
    const category = tokens.categories[key] ?? "colour";
    if (category !== previous && theme === "dark") lines.push(`  /* ${LABELS[category]} */`);
    previous = category;
    const source = options.valueAliases[key] ?? key;
    lines.push(`  --${options.prefix}${key}: ${tokenValue(tokens, theme, source)};`);
  }
  return lines;
}

export function themeCss(tokens: TokenSet, options: ThemeCssOptions): string {
  const lightKeys = tokens.keys.filter((key) => {
    if (tokens.lightOverrides.includes(key)) return true;
    // An alias whose source is overridden in light must be overridden too.
    const source = options.valueAliases[key];
    return source !== undefined && tokens.lightOverrides.includes(source);
  });
  return [
    "/*",
    ...options.header.map((line) => `   ${line}`),
    "*/",
    ":root {",
    ...block(tokens, "dark", tokens.keys, options),
    "}",
    "",
    '[data-theme="light"] {',
    ...block(tokens, "light", lightKeys, options),
    "}",
    "",
  ].join("\n");
}

export function fontsCss(header: readonly string[], faces: readonly string[]): string {
  return ["/*", ...header.map((line) => `   ${line}`), "*/", ...faces, ""].join("\n");
}
