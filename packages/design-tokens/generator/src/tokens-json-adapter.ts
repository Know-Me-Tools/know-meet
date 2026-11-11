// Replaces the vendor's `parse(text(source))` TOML reader. Reads the
// design-owned docs/design/tokens.json (operator decision Q-A2), validates every
// value for both themes and resolves light's inheritance from dark, exactly as
// [data-theme="light"] does in the prototype's km.css.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { type Category, classify, THEMED, validate } from "./classify.ts";
import { EXIT, ToolError } from "./errors.ts";

export type FontRole = "display" | "body" | "mono";
export const FONT_ROLES: readonly FontRole[] = ["display", "body", "mono"];

export interface FontSpec {
  readonly family: string;
  readonly weights: readonly number[];
  /** The tokens.json key holding this role's CSS font stack. */
  readonly token: string;
}

export interface TokenSet {
  readonly name: string;
  readonly version: string;
  readonly sha256: string;
  readonly sourcePath: string;
  /** Keys in tokens.json order (dark is the complete base set). */
  readonly keys: readonly string[];
  readonly dark: Readonly<Record<string, string>>;
  /** Fully resolved light theme (dark values plus light overrides). */
  readonly light: Readonly<Record<string, string>>;
  /** Keys tokens.json overrides in light, in file order. */
  readonly lightOverrides: readonly string[];
  readonly categories: Readonly<Record<string, Category>>;
  readonly fonts: Readonly<Record<FontRole, FontSpec>>;
  readonly fontDisplay: string;
}

type Json = Record<string, unknown>;

const isRecord = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function record(parent: Json, key: string, where: string): Json {
  const value = parent[key];
  if (!isRecord(value)) throw new ToolError(`${where}.${key} must be an object`);
  return value;
}

function stringMap(obj: Json, where: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== "string") throw new ToolError(`${where}.${key} must be a string`);
    out[key] = value;
  }
  return out;
}

function fontSpec(fonts: Json, role: FontRole): FontSpec {
  const spec = record(fonts, role, "tokens.json fonts");
  const { family, weights, token } = spec;
  const validWeights = Array.isArray(weights) && weights.every((w) => Number.isInteger(w));
  if (typeof family !== "string" || typeof token !== "string" || !validWeights) {
    throw new ToolError(
      `tokens.json fonts.${role} needs family (string), weights (integers) and token`,
    );
  }
  return { family, token, weights: weights.filter((w): w is number => typeof w === "number") };
}

function parseJson(raw: string, path: string): Json {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) throw new ToolError(`${path}: top level must be an object`);
    return parsed;
  } catch (error) {
    if (error instanceof ToolError) throw error;
    throw new ToolError(
      `${path}: invalid JSON (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}

export function loadTokens(path: string): TokenSet {
  if (!existsSync(path)) throw new ToolError(`token source not found: ${path}`, EXIT.missingInput);
  const raw = readFileSync(path, "utf8");
  const doc = parseJson(raw, path);
  const themes = record(doc, "themes", "tokens.json");
  const dark = stringMap(record(themes, "dark", "tokens.json themes"), "themes.dark");
  const overrides = stringMap(record(themes, "light", "tokens.json themes"), "themes.light");

  const categories: Record<string, Category> = {};
  for (const [key, value] of Object.entries(dark)) {
    const category = classify(key);
    categories[key] = category;
    validate(category, value, `themes.dark.${key}`);
  }
  for (const [key, value] of Object.entries(overrides)) {
    const category = categories[key];
    if (category === undefined) {
      throw new ToolError(
        `themes.light.${key} has no dark base value; light may only override dark keys`,
      );
    }
    if (!THEMED.has(category)) {
      throw new ToolError(
        `themes.light.${key} is a ${category} token; only colours and shadows may vary by theme`,
      );
    }
    validate(category, value, `themes.light.${key}`);
  }

  const fonts = record(doc, "fonts", "tokens.json");
  const fontSet = {
    display: fontSpec(fonts, "display"),
    body: fontSpec(fonts, "body"),
    mono: fontSpec(fonts, "mono"),
  };
  for (const role of FONT_ROLES) {
    if (dark[fontSet[role].token] === undefined) {
      throw new ToolError(
        `tokens.json fonts.${role}.token "${fontSet[role].token}" is not a token`,
      );
    }
  }
  const strategy = fonts["display-strategy"];
  const version = doc["version"];
  const name = doc["name"];

  return {
    name: typeof name === "string" ? name : "tokens",
    version: typeof version === "string" ? version : "0.0.0",
    sha256: createHash("sha256").update(raw).digest("hex"),
    sourcePath: path,
    keys: Object.keys(dark),
    dark,
    light: { ...dark, ...overrides },
    lightOverrides: Object.keys(overrides),
    categories,
    fonts: fontSet,
    fontDisplay: typeof strategy === "string" ? strategy : "swap",
  };
}

/** Value lookup that fails loudly when an emitter references a missing token. */
export function tokenValue(set: TokenSet, theme: "dark" | "light", key: string): string {
  const value = set[theme][key];
  if (value === undefined) throw new ToolError(`generator references unknown token "${key}"`);
  return value;
}

export function category(set: TokenSet, key: string): Category {
  const value = set.categories[key];
  if (value === undefined) throw new ToolError(`generator references unknown token "${key}"`);
  return value;
}
