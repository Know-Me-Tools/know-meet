// shadcn/ui variable mapping. shadcn components read --background, --primary,
// etc.; each is pointed at the Know Meet role the prototype uses for the same
// job (km.css). Values are var() references, so both themes follow the token
// CSS automatically.
//
// Three shadcn names already exist as Know Meet tokens and are NOT redefined:
//   --card    Know Meet "raised fill" (#1C2535 dark). The prototype's .card
//             container uses --surface, so a Card primitive must use bg-surface.
//   --muted   Same job in both systems (quiet fill, tracks).
//   --radius  12px in both systems.
import { ToolError } from "../errors.ts";
import type { TokenSet } from "../tokens-json-adapter.ts";

/**
 * shadcn variable -> Know Meet token, or a literal for Flat 2.0 lines.
 * D-6 (operator 2026-11-11): no borders, outlines or rings anywhere. --input is
 * the control FILL (use bg-input, never border-input); --ring is the focus FILL
 * (use bg-ring with text-on-focus on :focus-visible, never ring-* or outline-*).
 */
const MAPPING: ReadonlyArray<readonly [string, string, string]> = [
  ["background", "bg", "page ground (body)"],
  ["foreground", "fg", "body text"],
  ["card-foreground", "fg", "text on cards"],
  ["popover", "bg-2", ".menu and .sheet background"],
  ["popover-foreground", "fg", ""],
  ["primary", "ember-btn", ".btn-primary fill"],
  ["primary-foreground", "on-ember", ".btn-primary label"],
  ["secondary", "card", ".btn default fill"],
  ["secondary-foreground", "fg", ".btn default label"],
  ["muted-foreground", "fg-sub", "secondary text"],
  ["accent", "card-hov", "hover fill (.btn:hover, a.card:hover)"],
  ["accent-foreground", "fg", ""],
  ["destructive", "danger-btn", ".btn-danger fill"],
  ["destructive-foreground", "on-danger", ".btn-danger label"],
  ["border", "", "Flat 2.0: no visible borders; regions separate by fill"],
  ["input", "control", "control fill (bg-input); boundary >= 3:1 by fill, never a stroke"],
  ["ring", "focus", "focus fill (bg-ring + text-on-focus); never an outline or ring"],
  ["chart-1", "ember", ""],
  ["chart-2", "cyan", ""],
  ["chart-3", "green", ""],
  ["chart-4", "amber", ""],
  ["chart-5", "red", ""],
  ["sidebar", "bg-2", "app chrome"],
  ["sidebar-foreground", "fg", ""],
  ["sidebar-primary", "ember-btn", ""],
  ["sidebar-primary-foreground", "on-ember", ""],
  ["sidebar-accent", "card-hov", ""],
  ["sidebar-accent-foreground", "fg", ""],
  ["sidebar-border", "", "Flat 2.0"],
  ["sidebar-ring", "focus", "focus fill"],
];

function target(tokens: TokenSet, token: string): string {
  if (token === "") return "transparent";
  if (tokens.categories[token] !== "colour") {
    throw new ToolError(`shadcn mapping references "${token}", which is not a colour token`);
  }
  return `var(--${token})`;
}

export function shadcnCss(tokens: TokenSet, header: readonly string[]): string {
  const vars = MAPPING.map(([name, token, note]) => {
    const comment = note === "" ? "" : ` /* ${note} */`;
    return `  --${name}: ${target(tokens, token)};${comment}`;
  });
  const theme = MAPPING.map(([name]) => `  --color-${name}: var(--${name});`);
  return [
    "/*",
    ...header.map((line) => `   ${line}`),
    "   Import after tokens.css and theme.css. --card, --muted and --radius are",
    "   Know Meet tokens and keep their prototype meaning (see README).",
    "*/",
    "/* Declared on every themed root so var() re-resolves inside a [data-theme] subtree. */",
    ":root,",
    "[data-theme] {",
    ...vars,
    "}",
    "",
    "@theme inline {",
    ...theme,
    "}",
    "",
  ].join("\n");
}
