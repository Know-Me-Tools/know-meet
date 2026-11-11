// TJ-ARCH-MOB-001 compliant
import type { CapabilitySource, NoteFeed } from "@know-meet/application";
import type { Capability, Note } from "@know-meet/domain";
import { registerEntityTransport } from "@prometheus-ags/entity-graph-core";

/** Registers the Note and Capability transports with the entity graph, once at boot. */
export function registerNoteEntities(feed: NoteFeed, capabilities: CapabilitySource): void {
  registerEntityTransport<Note>("Note", {
    identify: (note) => note.id,
    authoritative: false,
    list: async (query) => {
      const rows = [...(await feed.list(query.signal))];
      return { rows, total: rows.length };
    },
    subscribe: (onChange) =>
      feed.subscribe((change) => onChange({ op: change.op, id: change.id, row: change.row })),
  });
  registerEntityTransport<Capability>("Capability", {
    identify: (capability) => capability.id,
    authoritative: true,
    list: async (query) => {
      const rows = [...(await capabilities.list(query.signal))];
      return { rows, total: rows.length };
    },
  });
}
