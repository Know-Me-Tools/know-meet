/** Raw, gzip (level 9) and brotli (quality 11) sizes of every asset in a dist/ directory. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

export interface AssetSize {
  readonly path: string;
  readonly raw: number;
  readonly gzip: number;
  readonly brotli: number;
}

export interface SizeTotals {
  readonly files: number;
  readonly raw: number;
  readonly gzip: number;
  readonly brotli: number;
}

export interface BundleReport {
  readonly dist: string;
  readonly totals: SizeTotals;
  /** Totals per extension (".js", ".css", ...); source maps excluded from every total. */
  readonly byExtension: Readonly<Record<string, SizeTotals>>;
  readonly assets: readonly AssetSize[];
  readonly sourceMaps: SizeTotals;
}

const TEXT_EXTENSIONS = new Set([".js", ".mjs", ".css", ".html", ".json", ".svg", ".txt", ".map", ".webmanifest"]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function sizeOf(root: string, path: string): AssetSize {
  const bytes = readFileSync(path);
  const mode = TEXT_EXTENSIONS.has(extname(path)) ? constants.BROTLI_MODE_TEXT : constants.BROTLI_MODE_GENERIC;
  return {
    path: relative(root, path),
    raw: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_MODE]: mode, [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length },
    }).length,
  };
}

function total(assets: readonly AssetSize[]): SizeTotals {
  return assets.reduce((t, a) => ({ files: t.files + 1, raw: t.raw + a.raw, gzip: t.gzip + a.gzip, brotli: t.brotli + a.brotli }), { files: 0, raw: 0, gzip: 0, brotli: 0 });
}

export function measureBundle(dist: string): BundleReport {
  if (!statSync(dist, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`--dist ${dist} is not a directory`);
  const all = walk(dist).sort().map((p) => sizeOf(dist, p));
  const maps = all.filter((a) => a.path.endsWith(".map"));
  const assets = all.filter((a) => !a.path.endsWith(".map"));
  const byExtension: Record<string, SizeTotals> = {};
  for (const ext of new Set(assets.map((a) => extname(a.path) || "(none)"))) {
    byExtension[ext] = total(assets.filter((a) => (extname(a.path) || "(none)") === ext));
  }
  return { dist, totals: total(assets), byExtension, assets, sourceMaps: total(maps) };
}
