import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** tests/fidelity, resolved from this file so every entry point agrees. */
export const FIDELITY_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const REPO_ROOT = resolve(FIDELITY_DIR, "..", "..");

export const DESIGN_DIR = join(REPO_ROOT, "docs", "design");
export const TOKENS_JSON = join(DESIGN_DIR, "tokens.json");
export const INVENTORY_JSON = join(DESIGN_DIR, "screen-inventory", "route-inventory.json");
export const FONTS_DIR = join(REPO_ROOT, "packages", "design-tokens", "fonts");

export const BASELINES_DIR = join(FIDELITY_DIR, "baselines");
export const BASELINE_MANIFEST = join(BASELINES_DIR, "manifest.json");
export const ORACLE_DIR = join(FIDELITY_DIR, "oracle");
export const THRESHOLDS_JSON = join(ORACLE_DIR, "thresholds.json");
export const APP_STATE_MAP_JSON = join(ORACLE_DIR, "app-state-map.json");
export const FEATURES_DIR = join(REPO_ROOT, "features");

/** Converts a repo-relative POSIX path to an absolute path. */
export function repoPath(relative: string): string {
  return join(REPO_ROOT, ...relative.split("/"));
}
