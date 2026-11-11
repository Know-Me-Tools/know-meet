import { type Capability, mergeCapabilities } from "@know-meet/domain";
import type { CapabilitySource } from "../notes/ports.ts";

/** One capability source over several, merged by id (later sources win). */
export function createCapabilityCatalog(sources: readonly CapabilitySource[]): CapabilitySource {
  return {
    list: async (signal): Promise<readonly Capability[]> => {
      signal?.throwIfAborted();
      const lists = await Promise.all(sources.map((source) => source.list(signal)));
      signal?.throwIfAborted();
      return mergeCapabilities(...lists);
    },
  };
}
