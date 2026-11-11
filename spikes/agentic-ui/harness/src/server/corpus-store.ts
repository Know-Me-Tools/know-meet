/**
 * Loads the committed corpus JSON once and resolves scenario ids:
 *   "<scenario>"          corpus/ag-ui/scenarios/<scenario>.json
 *   "a2ui/<surface>"      golden surface wrapped as an AG-UI run
 *   "hostile/<item>"      hostile item wrapped as an AG-UI run
 * Origin placeholders stay unresolved here; the server substitutes per request.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { a2uiScenarioId, wrapSurfaceAsScenario } from "../corpus-authoring/a2ui/a2ui-wrap.ts";
import { hostileScenarioId, wrapHostileAsScenario } from "../corpus-authoring/hostile/hostile-corpus.ts";
import type { GoldenSurfaceFile } from "../domain/a2ui-surface.ts";
import type { HostileCorpusFile, HostileItem } from "../domain/hostile.ts";
import type { ScenarioFile } from "../domain/scenario.ts";
import { CORPUS_PATHS } from "../shared/paths.ts";

export type ScenarioFamily = "ag-ui" | "a2ui" | "hostile";

export interface ScenarioEntry {
  readonly id: string;
  readonly family: ScenarioFamily;
  readonly scenario: ScenarioFile;
}

export interface ScenarioSummary {
  readonly id: string;
  readonly family: ScenarioFamily;
  readonly title: string;
  readonly tags: readonly string[];
  readonly validity: ScenarioFile["validity"];
  readonly userPrompt: string;
  readonly runs: number;
  readonly interactions: number;
}

function readJsonDir<T>(dir: string): T[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const parsed: T = JSON.parse(readFileSync(join(dir, name), "utf8"));
      return parsed;
    });
}

export class CorpusStore {
  readonly surfaces: ReadonlyMap<string, GoldenSurfaceFile>;
  readonly hostile: HostileCorpusFile;
  private readonly entries: ReadonlyMap<string, ScenarioEntry>;

  private constructor(scenarios: ScenarioFile[], surfaces: GoldenSurfaceFile[], hostile: HostileCorpusFile) {
    const entries = new Map<string, ScenarioEntry>();
    const add = (entry: ScenarioEntry): void => {
      if (entries.has(entry.id)) throw new Error(`duplicate scenario id ${entry.id}`);
      entries.set(entry.id, entry);
    };
    for (const scenario of scenarios) add({ id: scenario.id, family: "ag-ui", scenario });
    for (const surface of surfaces) add({ id: a2uiScenarioId(surface), family: "a2ui", scenario: wrapSurfaceAsScenario(surface) });
    for (const item of hostile.items) add({ id: hostileScenarioId(item), family: "hostile", scenario: wrapHostileAsScenario(item) });
    this.entries = entries;
    this.surfaces = new Map(surfaces.map((s) => [s.id, s]));
    this.hostile = hostile;
  }

  static load(): CorpusStore {
    const scenarios = readJsonDir<ScenarioFile>(CORPUS_PATHS.scenarios);
    const surfaces = readJsonDir<GoldenSurfaceFile>(CORPUS_PATHS.surfaces);
    const hostile: HostileCorpusFile = JSON.parse(readFileSync(CORPUS_PATHS.hostile, "utf8"));
    return new CorpusStore(scenarios, surfaces, hostile);
  }

  get(id: string): ScenarioEntry | undefined {
    return this.entries.get(id);
  }

  hostileItem(id: string): HostileItem | undefined {
    return this.hostile.items.find((item) => item.id === id);
  }

  summaries(): ScenarioSummary[] {
    return [...this.entries.values()].map(({ id, family, scenario }) => ({
      id,
      family,
      title: scenario.title,
      tags: scenario.tags,
      validity: scenario.validity,
      userPrompt: scenario.userPrompt,
      runs: scenario.runs.length,
      interactions: scenario.interactions.length,
    }));
  }

  counts(): Readonly<Record<ScenarioFamily, number>> {
    const counts: Record<ScenarioFamily, number> = { "ag-ui": 0, a2ui: 0, hostile: 0 };
    for (const entry of this.entries.values()) counts[entry.family] += 1;
    return counts;
  }
}
