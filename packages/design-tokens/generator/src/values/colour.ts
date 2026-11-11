// Replaces the vendor's `/^#[0-9a-fA-F]{6}$/` Dart-only check. Accepts every
// colour form tokens.json uses (hex 3/4/6/8, rgb()/rgba() with commas,
// `transparent`) and rejects anything else for every output, not just Dart.
import { ToolError } from "../errors.ts";

export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** 0..1 */
  readonly a: number;
}

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i;

function channel(text: string, where: string): number {
  const value = Number(text);
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new ToolError(`${where}: colour channel ${text} is outside 0..255`);
  }
  return value;
}

function fromHex(digits: string): Rgba {
  const full = digits.length <= 4 ? [...digits].map((c) => c + c).join("") : digits;
  const byte = (i: number): number => Number.parseInt(full.slice(i, i + 2), 16);
  return { r: byte(0), g: byte(2), b: byte(4), a: full.length === 8 ? byte(6) / 255 : 1 };
}

/** Parses a token colour or throws a ToolError naming the token. */
export function parseColour(value: string, where: string): Rgba {
  const v = value.trim();
  if (v === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const hex = HEX.exec(v);
  if (hex?.[1] !== undefined) return fromHex(hex[1]);
  const rgb = RGB.exec(v);
  if (rgb?.[1] !== undefined && rgb[2] !== undefined && rgb[3] !== undefined) {
    const a = rgb[4] === undefined ? 1 : Number(rgb[4]);
    if (!(a >= 0 && a <= 1)) throw new ToolError(`${where}: alpha ${rgb[4]} is outside 0..1`);
    return { r: channel(rgb[1], where), g: channel(rgb[2], where), b: channel(rgb[3], where), a };
  }
  throw new ToolError(
    `${where}: malformed colour "${value}" (expected #hex, rgb(), rgba() or transparent)`,
  );
}

export function isColourLiteral(value: string): boolean {
  const v = value.trim();
  return v === "transparent" || HEX.test(v) || RGB.test(v);
}

const hex2 = (n: number): string => Math.round(n).toString(16).padStart(2, "0").toUpperCase();

/** Dart `Color(0xAARRGGBB)` literal. */
export function toDartColor(c: Rgba): string {
  return `Color(0x${hex2(c.a * 255)}${hex2(c.r)}${hex2(c.g)}${hex2(c.b)})`;
}
