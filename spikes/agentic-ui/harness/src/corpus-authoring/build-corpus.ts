/**
 * Writes the golden corpus JSON files from the TypeScript definitions.
 * Usage: node src/corpus-authoring/build-corpus.ts
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { HARNESS_ROOT, CORPUS_PATHS } from "../shared/paths.ts";
import { buildHostileCorpus } from "./hostile/hostile-corpus.ts";
import { allScenarios, allSurfaces } from "./registry.ts";

interface ManifestEntry {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

function writeJson(path: string, value: unknown, manifest: ManifestEntry[]): void {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(path, text);
  manifest.push({
    path: relative(HARNESS_ROOT, path),
    sha256: createHash("sha256").update(text).digest("hex"),
    bytes: Buffer.byteLength(text),
  });
}

function resetDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    if (name.endsWith(".json")) rmSync(join(dir, name));
  }
}

function main(): void {
  const manifest: ManifestEntry[] = [];
  resetDir(CORPUS_PATHS.scenarios);
  resetDir(CORPUS_PATHS.surfaces);
  mkdirSync(CORPUS_PATHS.hostileDir, { recursive: true });

  for (const scenario of allScenarios()) writeJson(join(CORPUS_PATHS.scenarios, `${scenario.id}.json`), scenario, manifest);
  for (const surface of allSurfaces()) writeJson(join(CORPUS_PATHS.surfaces, `${surface.id}.json`), surface, manifest);
  writeJson(CORPUS_PATHS.hostile, buildHostileCorpus(), manifest);

  writeFileSync(CORPUS_PATHS.manifest, `${JSON.stringify({ generatedBy: "src/corpus-authoring/build-corpus.ts", files: manifest }, null, 2)}\n`);
  process.stdout.write(`wrote ${manifest.length} corpus files + manifest\n`);
}

main();
