// TJ-ARCH-MOB-001 compliant
import type { CapabilitySource } from "@know-meet/application";
import { decodeCapabilities, decodeCapabilityRegistry } from "./decode";

async function fetchJson(url: string, failure: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, signal ? { signal } : {});
  if (!response.ok) throw new Error(failure);
  return response.json();
}

/** The registry shipped as a static asset of the web build (`public/capabilities`). */
export function createStaticCapabilitySource(): CapabilitySource {
  return {
    list: async (signal) =>
      decodeCapabilityRegistry(
        await fetchJson("/capabilities/index.json", "Could not load capability registry", signal),
      ),
  };
}

/** Capabilities reported by the same-origin BFF. */
export function createHttpCapabilitySource(): CapabilitySource {
  return {
    list: async (signal) =>
      decodeCapabilities(
        await fetchJson("/api/capabilities", "Could not load backend capabilities", signal),
      ),
  };
}
