// clamp() breakpoint resolution (the vendor has none). Web output passes the
// clamp() through untouched; Flutter needs numbers, so a fluid size becomes a
// function of viewport width plus constants resolved at each configured viewport.
import { ToolError } from "../errors.ts";

/** value(width) = min(max(vw * width / 100 + px, min), max), in logical px. */
export interface Fluid {
  readonly min: number;
  readonly max: number;
  readonly vw: number;
  readonly px: number;
}

const CLAMP = /^clamp\(\s*([^,]+),\s*([^,]+),\s*([^,]+)\)$/;
const PX = /^(-?\d*\.?\d+)px$/;
const TERM = /^([+-]?)\s*(\d*\.?\d+)(vw|px)$/;

function px(text: string, where: string): number {
  const m = PX.exec(text.trim());
  if (m?.[1] === undefined) throw new ToolError(`${where}: clamp bound "${text}" must be in px`);
  return Number(m[1]);
}

function preferred(text: string, where: string): { vw: number; px: number } {
  // Split "3.6vw + 18px" / "2vw - 4px" into signed terms.
  const terms = text
    .trim()
    .replace(/\s*([+-])\s*/g, " $1")
    .split(/\s+/)
    .filter(Boolean);
  let vw = 0;
  let offset = 0;
  for (const term of terms) {
    const m = TERM.exec(term);
    if (m?.[2] === undefined || m[3] === undefined) {
      throw new ToolError(`${where}: unsupported clamp term "${term}" (only vw and px)`);
    }
    const value = Number(m[2]) * (m[1] === "-" ? -1 : 1);
    if (m[3] === "vw") vw += value;
    else offset += value;
  }
  return { vw, px: offset };
}

export function isClamp(value: string): boolean {
  return value.trim().startsWith("clamp(");
}

export function parseClamp(value: string, where: string): Fluid {
  const m = CLAMP.exec(value.trim());
  if (m?.[1] === undefined || m[2] === undefined || m[3] === undefined) {
    throw new ToolError(`${where}: malformed clamp() "${value}"`);
  }
  const min = px(m[1], where);
  const max = px(m[3], where);
  if (min > max) throw new ToolError(`${where}: clamp() minimum ${min} exceeds maximum ${max}`);
  return { min, max, ...preferred(m[2], where) };
}

/** Resolves a fluid size at a viewport width, rounded to 2 decimals. */
export function resolveFluid(f: Fluid, viewportWidth: number): number {
  const raw = (f.vw * viewportWidth) / 100 + f.px;
  return Math.round(Math.min(Math.max(raw, f.min), f.max) * 100) / 100;
}
