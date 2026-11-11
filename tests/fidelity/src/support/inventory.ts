import { readFileSync } from "node:fs";
import { INVENTORY_JSON } from "./repo-paths.ts";

export type Theme = "dark" | "light";
export type Access = "guest" | "sign-in" | "invitee";

export interface InventoryEntry {
  readonly id: string;
  readonly file: string;
  readonly hash: string;
  readonly title: string;
  readonly access: Access;
  readonly inScope: boolean;
  readonly scopeBasis: string;
  readonly source: string;
  readonly how?: string;
}

export interface Inventory {
  readonly version: string;
  readonly routeSource: { readonly path: string; readonly sha256: string };
  readonly captureMatrix: {
    readonly themes: readonly Theme[];
    readonly viewports: readonly number[];
  };
  readonly counts: { readonly inScope: number; readonly baselineCaptures: number };
  readonly routes: readonly InventoryEntry[];
}

export function loadInventory(path: string = INVENTORY_JSON): Inventory {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof parsed !== "object" || parsed === null || !("routes" in parsed)) {
    throw new Error(`${path}: not a know-meet-inventory/v1 document`);
  }
  return parsed as Inventory;
}

export function inScopeEntries(inventory: Inventory): InventoryEntry[] {
  return inventory.routes.filter((entry) => entry.inScope);
}

export function findEntry(inventory: Inventory, id: string): InventoryEntry {
  const entry = inventory.routes.find((candidate) => candidate.id === id);
  if (entry === undefined) throw new Error(`State ID "${id}" is not in the c02 inventory`);
  return entry;
}

/**
 * Baseline file stem for a state ID. IDs use dots (`agents.register.1`); file
 * names must be kebab-case, so dots become hyphens. Collisions are rejected by
 * `assertUniqueStems` so the mapping stays one-to-one.
 */
export function baselineStem(id: string): string {
  return id.replaceAll(".", "-");
}

export function assertUniqueStems(entries: readonly InventoryEntry[]): void {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const stem = baselineStem(entry.id);
    const prior = seen.get(stem);
    if (prior !== undefined) throw new Error(`Stem collision: ${prior} and ${entry.id} -> ${stem}`);
    seen.set(stem, entry.id);
  }
}

/** Relative path of one baseline image inside tests/fidelity/baselines. */
export function baselineRelPath(id: string, theme: Theme, viewport: number): string {
  return `${theme}/${viewport}/${baselineStem(id)}.png`;
}
