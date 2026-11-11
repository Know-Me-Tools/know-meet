// Converts validated CSS token values into Dart literals.
import { ToolError } from "../errors.ts";
import { parseColour, toDartColor } from "../values/colour.ts";
import { parseDurationMs, parseEasing, parseShadows } from "../values/css-values.ts";

/** `bg-2` -> `bg2`, `card-hov` -> `cardHov`, `leading-18px` -> `leading18px`. */
export function dartIdent(key: string): string {
  const parts = key.split("-").filter(Boolean);
  const ident = parts
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
  if (!/^[a-z][A-Za-z0-9]*$/.test(ident))
    throw new ToolError(`token "${key}" has no valid Dart name`);
  return ident;
}

/** Dart double literal without float noise. */
export function dartNum(n: number): string {
  const rounded = Math.round(n * 10000) / 10000;
  return Number.isInteger(rounded) ? `${rounded}.0` : String(rounded);
}

export function dartColor(value: string, where: string): string {
  return toDartColor(parseColour(value, where));
}

export function dartDuration(value: string, where: string): string {
  const micros = Math.round(parseDurationMs(value, where) * 1000);
  return micros % 1000 === 0
    ? `Duration(milliseconds: ${micros / 1000})`
    : `Duration(microseconds: ${micros})`;
}

const KEYWORD_CURVES = {
  ease: "Curves.ease",
  "ease-in": "Curves.easeIn",
  "ease-out": "Curves.easeOut",
  "ease-in-out": "Curves.easeInOut",
  linear: "Curves.linear",
} as const;

export function dartCurve(value: string, where: string): string {
  const easing = parseEasing(value, where);
  if (easing.kind === "keyword") return KEYWORD_CURVES[easing.name];
  return `Cubic(${easing.points.map(dartNum).join(", ")})`;
}

/**
 * CSS blur radius B is a Gaussian with sigma B/2. Flutter's BoxShadow.blurRadius
 * R maps to sigma 0.57735 * R + 0.5, so R = (B / 2 - 0.5) / 0.57735 renders the
 * same softness.
 */
function flutterBlur(cssBlur: number): number {
  if (cssBlur <= 1) return 0;
  return (cssBlur / 2 - 0.5) / 0.57735;
}

export function dartShadows(value: string, where: string): string {
  const shadows = parseShadows(value, where);
  if (shadows.length === 0) return "<BoxShadow>[]";
  const items = shadows.map((s) => {
    const parts = [
      `color: ${toDartColor(s.colour)}`,
      `offset: Offset(${dartNum(s.x)}, ${dartNum(s.y)})`,
      `blurRadius: ${dartNum(flutterBlur(s.blur))}`,
    ];
    if (s.spread !== 0) parts.push(`spreadRadius: ${dartNum(s.spread)}`);
    return `BoxShadow(${parts.join(", ")})`;
  });
  return `<BoxShadow>[${items.join(", ")}]`;
}

/** CSS position "34% 30%" -> Alignment(-0.32, -0.4). */
export function dartAlignment(value: string, where: string): string {
  const parts = value
    .trim()
    .split(/\s+/)
    .map((p) => Number(p.replace("%", "")));
  const [x, y = x] = parts;
  if (x === undefined || y === undefined || parts.some((p) => !Number.isFinite(p))) {
    throw new ToolError(`${where}: expected a CSS position in percent, got "${value}"`);
  }
  return `Alignment(${dartNum((x / 100) * 2 - 1)}, ${dartNum((y / 100) * 2 - 1)})`;
}

export function dartString(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}
