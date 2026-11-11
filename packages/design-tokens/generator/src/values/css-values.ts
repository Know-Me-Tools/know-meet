// Parsers for the non-colour CSS values tokens.json holds. Each throws a
// ToolError naming the token, so a malformed value fails the whole run.
import { ToolError } from "../errors.ts";
import { parseColour, type Rgba } from "./colour.ts";

const NUM = "(-?\\d*\\.?\\d+)";
const unit = (suffix: string): RegExp => new RegExp(`^${NUM}${suffix}$`);
const PX = unit("px");
const EM = unit("em");
const PCT = unit("%");
const BARE = unit("");
const MS = unit("ms");
const SEC = unit("s");

function match(re: RegExp, value: string): number | null {
  const m = re.exec(value.trim());
  return m?.[1] === undefined ? null : Number(m[1]);
}

export function parsePx(value: string, where: string): number {
  const n = match(PX, value) ?? (value.trim() === "0" ? 0 : null);
  if (n === null) throw new ToolError(`${where}: expected a px length, got "${value}"`);
  return n;
}

export function tryPx(value: string): number | null {
  return match(PX, value);
}

export function tryEm(value: string): number | null {
  return match(EM, value);
}

export function tryPercent(value: string): number | null {
  return match(PCT, value);
}

export function tryNumber(value: string): number | null {
  return match(BARE, value);
}

/** Letter spacing: `-0.025em` or `0`, returned in em. */
export function parseEm(value: string, where: string): number {
  const n = match(EM, value) ?? match(BARE, value);
  if (n === null || (match(BARE, value) !== null && n !== 0)) {
    throw new ToolError(`${where}: expected an em value or 0, got "${value}"`);
  }
  return n;
}

/** Duration in milliseconds. */
export function parseDurationMs(value: string, where: string): number {
  const ms = match(MS, value);
  if (ms !== null) return ms;
  const s = match(SEC, value);
  if (s !== null) return s * 1000;
  throw new ToolError(`${where}: expected a duration in ms or s, got "${value}"`);
}

export type Easing =
  | {
      readonly kind: "keyword";
      readonly name: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
    }
  | { readonly kind: "cubic"; readonly points: readonly [number, number, number, number] };

const KEYWORDS = ["ease", "ease-in", "ease-out", "ease-in-out", "linear"] as const;
const CUBIC = /^cubic-bezier\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)$/;

export function parseEasing(value: string, where: string): Easing {
  const v = value.trim();
  const keyword = KEYWORDS.find((k) => k === v);
  if (keyword !== undefined) return { kind: "keyword", name: keyword };
  const m = CUBIC.exec(v);
  if (m !== null) {
    const points = [m[1], m[2], m[3], m[4]].map((p) => Number(p));
    if (points.every((p) => Number.isFinite(p))) {
      const [a = 0, b = 0, c = 0, d = 0] = points;
      return { kind: "cubic", points: [a, b, c, d] };
    }
  }
  throw new ToolError(`${where}: expected cubic-bezier() or an easing keyword, got "${value}"`);
}

export interface Shadow {
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread: number;
  readonly colour: Rgba;
}

/** Splits on commas that are not inside parentheses. */
function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return parts;
}

/** `none` or a box-shadow list of `x y blur [spread] colour` (no inset). */
export function parseShadows(value: string, where: string): readonly Shadow[] {
  if (value.trim() === "none") return [];
  return splitTopLevel(value).map((layer) => {
    const colourStart = layer.search(/(#|rgba?\(|transparent)/);
    if (colourStart < 0 || layer.startsWith("inset")) {
      throw new ToolError(
        `${where}: unsupported shadow layer "${layer}" (expected x y blur [spread] colour)`,
      );
    }
    const lengths = layer.slice(0, colourStart).trim().split(/\s+/);
    if (lengths.length < 2 || lengths.length > 4) {
      throw new ToolError(`${where}: shadow layer "${layer}" needs 2 to 4 lengths`);
    }
    const [x = 0, y = 0, blur = 0, spread = 0] = lengths.map((l) => parsePx(l, where));
    return { x, y, blur, spread, colour: parseColour(layer.slice(colourStart), where) };
  });
}
