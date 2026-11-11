/** Filesystem locations inside the harness package. */
import { join, resolve } from "node:path";

export const HARNESS_ROOT = resolve(import.meta.dirname, "..", "..");

export const CORPUS_PATHS = {
  scenarios: join(HARNESS_ROOT, "corpus", "ag-ui", "scenarios"),
  surfaces: join(HARNESS_ROOT, "corpus", "a2ui", "surfaces"),
  hostileDir: join(HARNESS_ROOT, "corpus", "hostile"),
  hostile: join(HARNESS_ROOT, "corpus", "hostile", "hostile-corpus.json"),
  manifest: join(HARNESS_ROOT, "corpus", "manifest.json"),
} as const;

export const REPORTS_DIR = join(HARNESS_ROOT, "reports");
