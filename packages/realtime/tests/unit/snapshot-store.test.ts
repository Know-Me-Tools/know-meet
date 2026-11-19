// wr04 task 4.1: the store notifies only when the snapshot is replaced.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ConnectionState } from "@know-meet/domain";
import { createSnapshotStore } from "../../src/realtime-room/application/snapshot-store.ts";
import { CONNECTED, IDLE } from "../../src/realtime-room/domain/connection-mapping.ts";
import {
  INITIAL_SNAPSHOT,
  type RoomFacts,
} from "../../src/realtime-room/domain/snapshot-mapping.ts";

/** Facts for an empty room in `connection`, with everything else as the initial snapshot. */
function facts(connection: ConnectionState): RoomFacts {
  return {
    connection,
    local: null,
    remotes: [],
    screenShares: [],
    chat: INITIAL_SNAPSHOT.chat,
    availableDevices: INITIAL_SNAPSHOT.devices.available,
    activeDevices: INITIAL_SNAPSHOT.devices.active,
    audioPlayback: INITIAL_SNAPSHOT.audioPlayback,
    backgroundEffect: INITIAL_SNAPSHOT.backgroundEffect,
    support: INITIAL_SNAPSHOT.support,
  };
}

describe("snapshot store", () => {
  it("notifies on change, stays quiet otherwise, and stops after unsubscribe", () => {
    const store = createSnapshotStore();
    let notified = 0;
    const unsubscribe = store.subscribe(() => {
      notified += 1;
    });
    assert.equal(store.update(facts(IDLE)), false);
    assert.equal(notified, 0);
    assert.equal(store.update(facts(CONNECTED)), true);
    assert.equal(notified, 1);
    const snapshot = store.get();
    assert.equal(store.get(), snapshot);
    unsubscribe();
    store.update(facts(IDLE));
    assert.equal(notified, 1);
  });
});
