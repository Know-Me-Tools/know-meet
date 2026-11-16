import type { RoomSnapshot } from "@know-meet/application";
import { INITIAL_SNAPSHOT, nextSnapshot, type RoomFacts } from "./snapshot-mapping.ts";

/** Holds the current snapshot and notifies listeners only when it is replaced. */
export interface SnapshotStore {
  get(): RoomSnapshot;
  /** Applies fresh facts. Returns true when the snapshot changed (listeners were notified). */
  update(facts: RoomFacts): boolean;
  subscribe(listener: () => void): () => void;
}

export function createSnapshotStore(): SnapshotStore {
  let snapshot = INITIAL_SNAPSHOT;
  const listeners = new Set<() => void>();

  return {
    get: () => snapshot,
    update: (facts) => {
      const next = nextSnapshot(snapshot, facts);
      if (next === snapshot) return false;
      snapshot = next;
      // A copy, so a listener may unsubscribe while being notified.
      for (const listener of [...listeners]) listener();
      return true;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
