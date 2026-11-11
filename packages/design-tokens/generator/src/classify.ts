// Replaces the vendor's fixed TOML groups (surface/text/accent/status). Know Meet
// keys are the prototype's flat CSS custom property names, so the category comes
// from the key. Any key that matches no rule must be a colour, which means a
// mistyped or unknown non-colour token fails loudly instead of slipping through.
import { ToolError } from "./errors.ts";
import { isClamp, parseClamp } from "./values/clamp.ts";
import { parseColour } from "./values/colour.ts";
import {
  parseDurationMs,
  parseEasing,
  parseEm,
  parsePx,
  parseShadows,
  tryEm,
  tryNumber,
  tryPercent,
  tryPx,
} from "./values/css-values.ts";

export type Category =
  | "colour"
  | "shadow"
  | "font-family"
  | "font-weight"
  | "font-size"
  | "leading"
  | "tracking"
  | "space"
  | "radius"
  | "layout"
  | "breakpoint"
  | "z-index"
  | "duration"
  | "easing"
  | "gradient";

const RULES: ReadonlyArray<readonly [Category, RegExp]> = [
  ["shadow", /^shadow-|-shadow$/],
  ["font-weight", /^font-weight-/],
  ["font-family", /^font-(display|body|mono)$/],
  ["font-size", /^text-/],
  ["leading", /^leading-/],
  ["tracking", /^tracking-/],
  ["space", /^s\d+$/],
  ["radius", /^radius(-|$)/],
  ["breakpoint", /^bp-\d+$/],
  ["z-index", /^z-/],
  ["duration", /^(dur|dot|anim)(-|$)/],
  ["easing", /^ease-/],
  ["gradient", /^orb-/],
  ["layout", /^(header-h|page-max|rs-w)$/],
];

/** Theme-dependent categories: the only ones light may override. */
export const THEMED: ReadonlySet<Category> = new Set<Category>(["colour", "shadow"]);

export function classify(key: string): Category {
  return RULES.find(([, re]) => re.test(key))?.[0] ?? "colour";
}

function requireOne(ok: boolean, where: string, expected: string, value: string): void {
  if (!ok) throw new ToolError(`${where}: expected ${expected}, got "${value}"`);
}

/** Throws a ToolError when the value does not fit the key's category. */
export function validate(category: Category, value: string, where: string): void {
  switch (category) {
    case "colour":
      parseColour(value, where);
      return;
    case "shadow":
      parseShadows(value, where);
      return;
    case "font-family":
      requireOne(/^'[^']+'(,\s*[\w' -]+)*$/.test(value), where, "a quoted font stack", value);
      return;
    case "font-weight":
      requireOne(/^[1-9]00$/.test(value), where, "a font weight 100..900", value);
      return;
    case "font-size":
      if (isClamp(value)) parseClamp(value, where);
      else
        requireOne(
          tryPx(value) !== null || tryEm(value) !== null,
          where,
          "px, em or clamp()",
          value,
        );
      return;
    case "leading":
      requireOne(
        tryNumber(value) !== null || tryPx(value) !== null,
        where,
        "a unitless or px line height",
        value,
      );
      return;
    case "tracking":
      parseEm(value, where);
      return;
    case "space":
    case "layout":
    case "breakpoint":
      parsePx(value, where);
      return;
    case "radius":
      requireOne(tryPx(value) !== null || tryPercent(value) !== null, where, "px or %", value);
      return;
    case "z-index":
      requireOne(/^-?\d+$/.test(value), where, "an integer z-index", value);
      return;
    case "duration":
      parseDurationMs(value, where);
      return;
    case "easing":
      parseEasing(value, where);
      return;
    case "gradient":
      requireOne(
        /^\d*\.?\d+%(\s+\d*\.?\d+%)?$/.test(value),
        where,
        "one or two percentages",
        value,
      );
      return;
  }
}
