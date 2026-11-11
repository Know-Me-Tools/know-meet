import { readFileSync } from "node:fs";
import type { BaselineManifest } from "../capture/baseline-manifest.ts";
import type { Access } from "./inventory.ts";
import {
  APP_STATE_MAP_JSON,
  BASELINE_MANIFEST,
  THRESHOLDS_JSON,
  TOKENS_JSON,
} from "./repo-paths.ts";
import type { UiRole } from "./state-drivers.ts";

export interface StateThreshold {
  readonly maxDiffPixelRatio: number;
  readonly threshold: number;
  readonly basis: string;
}

export interface Adjudication {
  readonly cell: string;
  readonly ground: string;
  readonly change: string;
  readonly decidedBy: string;
}

export interface FidelityOracle {
  readonly status: string;
  readonly comparison: { readonly default: StateThreshold };
  readonly perState: Readonly<Record<string, StateThreshold>>;
  readonly adjudications: readonly Adjudication[];
}

export interface AppStateMap {
  readonly status: string;
  readonly roles: Readonly<Record<UiRole | "titlebar" | "appnav" | "main", string>>;
  readonly states: Readonly<Record<string, { readonly path: string; readonly access: Access }>>;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export const loadOracle = (path: string = THRESHOLDS_JSON): FidelityOracle =>
  readJson<FidelityOracle>(path);
export const loadManifest = (path: string = BASELINE_MANIFEST): BaselineManifest =>
  readJson<BaselineManifest>(path);
export const loadAppStateMap = (path: string = APP_STATE_MAP_JSON): AppStateMap =>
  readJson<AppStateMap>(path);

export function thresholdFor(oracle: FidelityOracle, stateId: string): StateThreshold {
  const threshold = oracle.perState[stateId];
  if (threshold === undefined) throw new Error(`No frozen threshold for state "${stateId}"`);
  return threshold;
}

/** A cell design-lead logged as a fidelity defect before the run always FAILs. */
export function loggedDefect(oracle: FidelityOracle, cell: string): Adjudication | undefined {
  return oracle.adjudications.find(
    (entry) => entry.cell === cell && entry.ground === "fidelity-defect",
  );
}

type TokenTheme = Readonly<Record<string, string>>;

/** Reads one token value, applying light's inherit-from-dark rule (theme-behaviour.md). */
export function tokenValue(
  name: string,
  theme: "dark" | "light" = "dark",
  path: string = TOKENS_JSON,
): string {
  const tokens = readJson<{ themes: { dark: TokenTheme; light: TokenTheme } }>(path);
  const value = tokens.themes[theme][name] ?? tokens.themes.dark[name];
  if (value === undefined) throw new Error(`Token "${name}" is not in ${path}`);
  return value;
}

/** CSS time ("240ms", "0.24s", "1e-06s") to milliseconds. */
export function cssTimeToMs(value: string): number {
  const trimmed = value.trim();
  const amount = Number.parseFloat(trimmed);
  if (Number.isNaN(amount)) throw new Error(`Not a CSS time: "${value}"`);
  return trimmed.endsWith("ms") ? amount : amount * 1000;
}

export function normaliseEasing(value: string): string {
  return value.replaceAll(/\s+/g, "").toLowerCase();
}
