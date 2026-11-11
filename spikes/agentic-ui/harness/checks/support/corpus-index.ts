/**
 * Synchronous corpus index used to generate one test per scenario at
 * collection time (titles must be known before the server is queried).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { HostileCorpusFile } from "../../src/domain/hostile.ts";
import type { ScenarioFile } from "../../src/domain/scenario.ts";
import { CORPUS_PATHS } from "../../src/shared/paths.ts";

function jsonNames(dir: string): string[] {
  return readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .sort()
    .map((n) => n.slice(0, -".json".length));
}

export interface IndexedScenario {
  readonly id: string;
  readonly tags: readonly string[];
  readonly interactive: boolean;
}

export function agUiScenarios(): IndexedScenario[] {
  return jsonNames(CORPUS_PATHS.scenarios).map((name) => {
    const file: ScenarioFile = JSON.parse(readFileSync(join(CORPUS_PATHS.scenarios, `${name}.json`), "utf8"));
    return { id: file.id, tags: file.tags, interactive: file.interactions.length > 0 };
  });
}

export function surfaceIds(): string[] {
  return jsonNames(CORPUS_PATHS.surfaces);
}

export function hostileIds(): { readonly id: string; readonly category: string }[] {
  const corpus: HostileCorpusFile = JSON.parse(readFileSync(CORPUS_PATHS.hostile, "utf8"));
  return corpus.items.map((i) => ({ id: i.id, category: i.category }));
}
