// Configurable, self-hosted fonts. Replaces the vendor's hard-coded
// `{ display: "spaceGrotesk", ... }` map and its GoogleFonts.* calls: the shells
// set CSP font-src 'self', so faces come from packages/design-tokens/fonts
// (c02 task 2.2) as listed in token-generator.config.json.
import { existsSync } from "node:fs";
import { relative, sep } from "node:path";
import type { FontFace, GeneratorConfig } from "./config.ts";
import { EXIT, ToolError } from "./errors.ts";
import { FONT_ROLES, type TokenSet } from "./tokens-json-adapter.ts";

function weightRange(face: FontFace): readonly [number, number] {
  const [low = "400", high] = face.weight.split(" ");
  return [Number(low), Number(high ?? low)];
}

/**
 * Every face file must exist, every family must be one tokens.json names, and
 * every weight tokens.json says the prototype loads must be covered by a face.
 */
export function checkFonts(config: GeneratorConfig, tokens: TokenSet): void {
  const families = new Set(FONT_ROLES.map((role) => tokens.fonts[role].family));
  for (const face of config.fontFaces) {
    if (!existsSync(face.file))
      throw new ToolError(`font file missing: ${face.file}`, EXIT.missingInput);
    if (!families.has(face.family)) {
      throw new ToolError(`font face "${face.family}" is not a family named in tokens.json fonts`);
    }
  }
  for (const role of FONT_ROLES) {
    const spec = tokens.fonts[role];
    for (const weight of spec.weights) {
      const covered = config.fontFaces.some((face) => {
        const [low, high] = weightRange(face);
        return face.family === spec.family && weight >= low && weight <= high;
      });
      if (!covered)
        throw new ToolError(
          `no font face covers ${spec.family} ${weight} (tokens.json fonts.${role})`,
        );
    }
  }
}

const toUrl = (path: string): string => path.split(sep).join("/");

/** @font-face rules with URLs relative to the CSS file's directory. */
export function fontFaceCss(config: GeneratorConfig, tokens: TokenSet, cssDir: string): string[] {
  return config.fontFaces.map((face) =>
    [
      "@font-face {",
      `  font-family: '${face.family}';`,
      "  font-style: normal;",
      `  font-weight: ${face.weight};`,
      `  font-display: ${tokens.fontDisplay};`,
      `  src: url('${toUrl(relative(cssDir, face.file))}') format('woff2');`,
      "}",
    ].join("\n"),
  );
}
