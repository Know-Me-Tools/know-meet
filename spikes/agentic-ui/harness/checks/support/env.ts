/**
 * Check-suite environment.
 *   SPIKE_URL        prototype page URL (required), e.g. http://localhost:4173/
 *   SPIKE_NAME       label for reports (default "prototype")
 *   KM_HARNESS_URL   mock server base URL (default http://127.0.0.1:4317)
 *   CHECK_RATE       optional `rate` override passed to the prototype (deltas/s, 0 = unthrottled)
 *   CHECK_GAP        optional `gap` override (ms)
 */
import { DEFAULT_PORTS } from "../../src/shared/placeholders.ts";

export const HARNESS_URL = (process.env["KM_HARNESS_URL"] ?? `http://127.0.0.1:${DEFAULT_PORTS.mock}`).replace(/\/$/, "");

export const SPIKE_NAME = (process.env["SPIKE_NAME"] ?? "prototype").replace(/[^a-z0-9-]/gi, "-").toLowerCase();

export function spikeUrl(): URL {
  const raw = process.env["SPIKE_URL"];
  if (raw === undefined || raw.trim() === "") {
    throw new Error("SPIKE_URL is not set: point it at a prototype build, e.g. SPIKE_URL=http://localhost:4173/ pnpm check");
  }
  return new URL(raw);
}

export function pacingOverrides(): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  const rate = process.env["CHECK_RATE"];
  const gap = process.env["CHECK_GAP"];
  if (rate !== undefined && rate !== "") out["rate"] = rate;
  if (gap !== undefined && gap !== "") out["gap"] = gap;
  return out;
}

let counter = 0;

/** Unique, readable session id per test (the server keys its request log by it). */
export function newSessionId(label: string): string {
  counter += 1;
  return `${SPIKE_NAME}-${label.replace(/[^a-z0-9]+/gi, "-")}-${Date.now().toString(36)}-${counter}`;
}
