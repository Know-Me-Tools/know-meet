/**
 * Audits a built dist/ for the 16.5 items: inlined data: fonts in CSS, KaTeX font files emitted,
 * and the raw-HTML parser (rehype-raw -> hast-util-raw -> parse5) in the JS bundle.
 *   node gates/scripts/dist-audit.ts <label> > gates/raw/dist-audit-<label>.json
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";

const DIST = resolve(import.meta.dirname, "..", "..", "dist", "assets");
const label = process.argv[2] ?? "unlabelled";
const files = readdirSync(DIST).filter((f) => !f.endsWith(".map"));
const css = files.filter((f) => f.endsWith(".css"));
const js = files.filter((f) => f.endsWith(".js"));
const count = (text: string, re: RegExp): number => (text.match(re) ?? []).length;

const dataFonts = css.map((f) => ({ file: f, dataFontUrls: count(readFileSync(join(DIST, f), "utf8"), /url\(\s*["']?data:font\//g) })).filter((x) => x.dataFontUrls > 0);
const fontFiles = files.filter((f) => /\.(woff2?|ttf)$/.test(f));
const rawParser = js
  .map((f) => {
    const text = readFileSync(join(DIST, f), "utf8");
    return { file: f, parse5Markers: count(text, /parse5|startTagInBody|_insertCharacters/g), hastRaw: count(text, /hast-util-raw|rehype-raw/g) };
  })
  .filter((x) => x.parse5Markers + x.hastRaw > 0);
const entry = js.filter((f) => f.startsWith("index-"));
const brotli = (f: string): number => brotliCompressSync(readFileSync(join(DIST, f)), { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;

process.stdout.write(`${JSON.stringify({
  label,
  at: new Date().toISOString(),
  dataFontsInCss: dataFonts,
  emittedFontFiles: fontFiles.length,
  rawHtmlParserMarkers: rawParser,
  entryChunks: entry.map((f) => ({ file: f, bytes: statSync(join(DIST, f)).size, brotli: brotli(f) })),
}, null, 2)}\n`);
