// Loads token-generator.config.json. Replaces the vendor's hard-coded output
// paths (desktop/src/theme.css, mobile/lib/core/theme/tokens.dart) and its
// hard-coded font map.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EXIT, ToolError } from "./errors.ts";

export interface FontFace {
  readonly family: string;
  /** Absolute path to the font file. */
  readonly file: string;
  /** CSS font-weight: a single weight ("500") or a variable range ("300 700"). */
  readonly weight: string;
}

export interface BrandDocsOutput {
  readonly file: string;
  /** Custom property prefix without dashes, e.g. "km-" gives --km-bg. */
  readonly prefix: string;
  /** Emit key A with the value of key B (the brand hero keeps its own display size). */
  readonly valueAliases: Readonly<Record<string, string>>;
}

export interface GeneratorConfig {
  readonly configPath: string;
  readonly source: string;
  readonly fluidViewports: readonly number[];
  readonly fontDir: string;
  readonly fontFaces: readonly FontFace[];
  readonly webDir: string;
  readonly flutterDir: string;
  readonly paletteClass: string;
  readonly tokensClass: string;
  readonly brandDocs: BrandDocsOutput | null;
  readonly manifest: string;
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function obj(parent: Json, key: string): Json {
  const value = parent[key];
  if (!isRecord(value)) throw new ToolError(`config: "${key}" must be an object`, EXIT.usage);
  return value;
}

function str(parent: Json, key: string): string {
  const value = parent[key];
  if (typeof value !== "string" || value === "") {
    throw new ToolError(`config: "${key}" must be a non-empty string`, EXIT.usage);
  }
  return value;
}

const DART_CLASS = /^[A-Z][A-Za-z0-9]*$/;

function fontFaces(fonts: Json, at: (p: string) => string): FontFace[] {
  const faces = fonts["faces"];
  if (!Array.isArray(faces) || faces.length === 0) {
    throw new ToolError('config: "fonts.faces" must be a non-empty array', EXIT.usage);
  }
  const dir = at(str(fonts, "dir"));
  return faces.map((face: unknown) => {
    if (!isRecord(face))
      throw new ToolError("config: each font face must be an object", EXIT.usage);
    const weight = str(face, "weight");
    if (!/^[1-9]00( [1-9]00)?$/.test(weight)) {
      throw new ToolError(
        `config: font weight "${weight}" must be "500" or a range "300 700"`,
        EXIT.usage,
      );
    }
    return { family: str(face, "family"), file: resolve(dir, str(face, "file")), weight };
  });
}

function brandDocs(outputs: Json, at: (p: string) => string): BrandDocsOutput | null {
  if (outputs["brandDocs"] === undefined) return null;
  const brand = obj(outputs, "brandDocs");
  const aliases = brand["valueAliases"] ?? {};
  if (!isRecord(aliases) || !Object.values(aliases).every((v) => typeof v === "string")) {
    throw new ToolError(
      'config: "brandDocs.valueAliases" must map token names to token names',
      EXIT.usage,
    );
  }
  const valueAliases: Record<string, string> = {};
  for (const [key, value] of Object.entries(aliases))
    if (typeof value === "string") valueAliases[key] = value;
  return { file: at(str(brand, "file")), prefix: str(brand, "prefix"), valueAliases };
}

export function loadConfig(configPath: string): GeneratorConfig {
  if (!existsSync(configPath))
    throw new ToolError(`config not found: ${configPath}`, EXIT.missingInput);
  let doc: unknown;
  try {
    doc = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new ToolError(`config ${configPath}: invalid JSON (${String(error)})`, EXIT.usage);
  }
  if (!isRecord(doc))
    throw new ToolError(`config ${configPath}: top level must be an object`, EXIT.usage);
  const at = (p: string): string => resolve(dirname(configPath), p);

  const viewports = doc["fluidViewports"];
  if (!Array.isArray(viewports) || !viewports.every((v) => Number.isInteger(v) && v > 0)) {
    throw new ToolError('config: "fluidViewports" must be positive integer widths', EXIT.usage);
  }
  const fonts = obj(doc, "fonts");
  const outputs = obj(doc, "outputs");
  const web = obj(outputs, "web");
  const flutter = obj(outputs, "flutter");
  const paletteClass = str(flutter, "paletteClass");
  const tokensClass = str(flutter, "tokensClass");
  if (!DART_CLASS.test(paletteClass) || !DART_CLASS.test(tokensClass)) {
    throw new ToolError("config: Dart class names must be UpperCamelCase", EXIT.usage);
  }

  return {
    configPath,
    source: at(str(doc, "source")),
    fluidViewports: viewports.filter((v): v is number => typeof v === "number"),
    fontDir: at(str(fonts, "dir")),
    fontFaces: fontFaces(fonts, at),
    webDir: at(str(web, "dir")),
    flutterDir: at(str(flutter, "dir")),
    paletteClass,
    tokensClass,
    brandDocs: brandDocs(outputs, at),
    manifest: at(str(outputs, "manifest")),
  };
}
