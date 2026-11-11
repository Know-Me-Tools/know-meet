import { test as base, createBdd } from "playwright-bdd";
import type { BaselineManifest } from "../src/capture/baseline-manifest.ts";
import {
  type Inventory,
  type InventoryEntry,
  inScopeEntries,
  loadInventory,
} from "../src/support/inventory.ts";
import {
  type AppStateMap,
  type FidelityOracle,
  loadAppStateMap,
  loadManifest,
  loadOracle,
} from "../src/support/oracle.ts";
import type { CommandResult } from "../src/support/run-command.ts";
import type { RenderTarget, UiRole } from "../src/support/state-drivers.ts";

/** Per-scenario state shared between steps; cleanups run after the scenario, last first. */
export interface ScenarioState {
  lastRun?: CommandResult;
  scratchDir?: string;
  scratchBaseUrl?: string;
  comparisonFailed?: boolean;
  exceededCells?: string[];
  pageUrl?: string;
  consoleErrors?: string[];
  focusStops?: string[];
  readonly cleanups: Array<() => void | Promise<void>>;
}

interface Fixtures {
  inventory: Inventory;
  oracle: FidelityOracle;
  manifest: BaselineManifest;
  appStateMap: AppStateMap;
  appTarget: RenderTarget;
  scenario: ScenarioState;
}

export const test = base.extend<Fixtures>({
  inventory: async ({}, use) => use(loadInventory()),
  oracle: async ({}, use) => use(loadOracle()),
  manifest: async ({}, use) => use(loadManifest()),
  appStateMap: async ({}, use) => use(loadAppStateMap()),
  appTarget: async ({ appStateMap, baseURL }, use) => {
    const origin = baseURL ?? "";
    await use({
      name: "app",
      urlFor: (entry: InventoryEntry) => {
        const state = appStateMap.states[entry.id];
        if (state === undefined)
          throw new Error(
            `BLOCKED: no app route for state "${entry.id}" in oracle/app-state-map.json`,
          );
        return `${origin}${state.path}`;
      },
      selector: (role: UiRole) => appStateMap.roles[role],
    });
  },
  scenario: async ({}, use) => {
    const state: ScenarioState = { cleanups: [] };
    await use(state);
    for (const cleanup of [...state.cleanups].reverse()) await cleanup();
  },
});

export const { Given, When, Then } = createBdd(test);

export function inScopeIdsOf(inventory: Inventory, page?: string): InventoryEntry[] {
  return inScopeEntries(inventory).filter(
    (entry) => page === undefined || entry.id.split(".")[0] === page,
  );
}
