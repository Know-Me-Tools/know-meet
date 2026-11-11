/**
 * Gate 16.3 build wrapper. Loads a prototype's own vite.config.ts unchanged and, for
 * KM_BUILD_VARIANT=no-profiling, drops the alias of react-dom/client to react-dom/profiling.
 * Used with `vite build --configLoader native --config <this file> --outDir <dir>` run from the
 * prototype directory, so the prototype source is never edited.
 */
import { pathToFileURL } from "node:url";
import { join } from "node:path";

interface AliasEntry {
  readonly find: string | RegExp;
  readonly replacement: string;
}

interface ConfigShape {
  readonly resolve?: { readonly alias?: readonly AliasEntry[] };
  readonly [key: string]: unknown;
}

const variant = process.env.KM_BUILD_VARIANT ?? "no-profiling";
if (variant !== "no-profiling" && variant !== "profiling") throw new Error(`unknown KM_BUILD_VARIANT ${variant}`);

const base = (await import(pathToFileURL(join(process.cwd(), "vite.config.ts")).href)) as { default: ConfigShape };
const config = base.default;
const alias = config.resolve?.alias ?? [];
const kept = variant === "profiling" ? alias : alias.filter((a) => a.replacement !== "react-dom/profiling");
if (variant === "no-profiling" && kept.length === alias.length) throw new Error("no react-dom/profiling alias found to drop");

export default { ...config, resolve: { ...config.resolve, alias: kept } };
