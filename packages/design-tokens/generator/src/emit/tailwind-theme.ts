// Tailwind 4 theme. Replaces the vendor's single literal @theme block (which
// froze dark values into utilities). Colours go through `@theme inline` as
// var() references, so utilities follow [data-theme] at runtime. Theme-invariant
// scales are literal and identical to tokens.css.
//
// Not emitted, because Tailwind 4 has no theme namespace for them or because
// they vary by theme and Tailwind would freeze them: shadows (use
// `shadow-(--shadow-float)`), z-index (`z-(--z-menu)`), durations
// (`duration-(--dur)`), orb gradient geometry.
import type { Category } from "../classify.ts";
import { type TokenSet, tokenValue } from "../tokens-json-adapter.ts";
import { tryPx } from "../values/css-values.ts";

/** Category -> Tailwind namespace for theme-invariant tokens whose key starts with it. */
const SAME_NAME: ReadonlySet<Category> = new Set<Category>([
  "font-family",
  "font-weight",
  "font-size",
  "leading",
  "tracking",
  "easing",
]);

function themeName(key: string, category: Category): string | null {
  if (SAME_NAME.has(category)) return key;
  switch (category) {
    case "radius":
      // `radius` alone is not a Tailwind key; it becomes rounded-base.
      return key === "radius" ? "radius-base" : key;
    case "space":
      return `spacing-${key}`;
    case "layout":
      return key === "page-max" ? `container-${key}` : `spacing-${key}`;
    default:
      return null;
  }
}

/** bp-767 (prototype max-width: 767px) -> --breakpoint-bp768: 768px, so `max-bp768:` reproduces it. */
function breakpoint(key: string, value: string): string | null {
  const px = tryPx(value);
  if (px === null) return null;
  const min = px + 1;
  return `  --breakpoint-bp${min}: ${min}px; /* ${key}: max-bp${min}: = @media (max-width: ${px}px) */`;
}

export function tailwindThemeCss(tokens: TokenSet, header: readonly string[]): string {
  const literal: string[] = [];
  const colours: string[] = [];
  for (const key of tokens.keys) {
    const category = tokens.categories[key] ?? "colour";
    const value = tokenValue(tokens, "dark", key);
    if (category === "colour") {
      colours.push(`  --color-${key}: var(--${key});`);
    } else if (category === "breakpoint") {
      const line = breakpoint(key, value);
      if (line !== null) literal.push(line);
    } else {
      const name = themeName(key, category);
      if (name !== null) literal.push(`  --${name}: ${value};`);
    }
  }
  return [
    "/*",
    ...header.map((line) => `   ${line}`),
    "   Import after tokens.css in the app stylesheet that imports tailwindcss.",
    "   Default colour palette, font sizes and breakpoints are reset so only",
    "   Know Meet tokens produce utilities (no ad-hoc colours).",
    "*/",
    "@theme {",
    "  --color-*: initial;",
    "  --text-*: initial;",
    "  --breakpoint-*: initial;",
    `  --default-font-family: ${tokenValue(tokens, "dark", tokens.fonts.body.token)};`,
    `  --default-mono-font-family: ${tokenValue(tokens, "dark", tokens.fonts.mono.token)};`,
    ...literal,
    "}",
    "",
    "@theme inline {",
    ...colours,
    "}",
    "",
  ].join("\n");
}
