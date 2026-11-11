// Builds every output file in memory from one validated token set. Nothing is
// written here, so a malformed token aborts the run before any file changes.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { GeneratorConfig } from "./config.ts";
import { dartTheme } from "./emit/dart-theme.ts";
import { dartTokens } from "./emit/dart-tokens.ts";
import { shadcnCss } from "./emit/shadcn-css.ts";
import { tailwindThemeCss } from "./emit/tailwind-theme.ts";
import { fontsCss, themeCss } from "./emit/web-css.ts";
import { ToolError } from "./errors.ts";
import { checkFonts, fontFaceCss } from "./fonts.ts";
import { banner, type OutputFile } from "./output.ts";
import { loadTokens, type TokenSet } from "./tokens-json-adapter.ts";

/** Nearest ancestor holding pnpm-workspace.yaml, so banners name repo paths. */
function workspaceRoot(from: string): string {
  let dir = from;
  while (dirname(dir) !== dir) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = dirname(dir);
  }
  return from;
}

function checkAliases(tokens: TokenSet, aliases: Readonly<Record<string, string>>): void {
  for (const [key, source] of Object.entries(aliases)) {
    if (tokens.categories[key] === undefined || tokens.categories[source] === undefined) {
      throw new ToolError(`brandDocs.valueAliases ${key} -> ${source} names an unknown token`);
    }
  }
}

export interface Generation {
  readonly tokens: TokenSet;
  readonly root: string;
  readonly files: readonly OutputFile[];
}

export function generate(config: GeneratorConfig): Generation {
  const tokens = loadTokens(config.source);
  checkFonts(config, tokens);
  const root = workspaceRoot(dirname(config.configPath));
  const header = banner(relative(root, config.source));
  const web = (name: string): string => join(config.webDir, name);
  const files: OutputFile[] = [
    {
      path: web("tokens.css"),
      content: themeCss(tokens, { header, prefix: "", valueAliases: {} }),
    },
    {
      path: web("fonts.css"),
      content: fontsCss(header, fontFaceCss(config, tokens, config.webDir)),
    },
    { path: web("theme.css"), content: tailwindThemeCss(tokens, header) },
    { path: web("shadcn.css"), content: shadcnCss(tokens, header) },
    { path: join(config.flutterDir, "tokens.g.dart"), content: dartTokens(tokens, config, header) },
    {
      path: join(config.flutterDir, "km_theme.g.dart"),
      content: dartTheme(tokens, config, header),
    },
  ];
  if (config.brandDocs !== null) {
    const brand = config.brandDocs;
    checkAliases(tokens, brand.valueAliases);
    const aliasNote = Object.entries(brand.valueAliases).map(
      ([k, v]) => `--${brand.prefix}${k} carries the value of ${v}.`,
    );
    files.push({
      path: brand.file,
      content: themeCss(tokens, {
        header: [
          ...header,
          `Brand documents' stylesheet (operator decision D-4): every token as --${brand.prefix}<key>.`,
          'Dark is the default theme. Apply [data-theme="light"] on <html> for light.',
          ...aliasNote,
        ],
        prefix: brand.prefix,
        valueAliases: brand.valueAliases,
      }),
    });
  }
  const digest = (text: string): string => createHash("sha256").update(text).digest("hex");
  const manifest = {
    generatedBy: "@know-meet/design-tokens generator",
    source: { path: relative(root, config.source), version: tokens.version, sha256: tokens.sha256 },
    outputs: files.map((f) => ({ path: relative(root, f.path), sha256: digest(f.content) })),
  };
  files.push({ path: config.manifest, content: `${JSON.stringify(manifest, null, 2)}\n` });
  return { tokens, root, files };
}
