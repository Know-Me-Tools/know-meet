// wr04 task 4.1: the store notifies only when the snapshot is replaced.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONNECTED, IDLE } from "../../src/connection-mapping.ts";
import { createSnapshotStore } from "../../src/snapshot-store.ts";

describe("snapshot store", () => {
  it("notifies on change, stays quiet otherwise, and stops after unsubscribe", () => {
    const store = createSnapshotStore();
    let notified = 0;
    const unsubscribe = store.subscribe(() => {
      notified += 1;
    });
    assert.equal(store.update({ connection: IDLE, local: null, remotes: [] }), false);
    assert.equal(notified, 0);
    assert.equal(store.update({ connection: CONNECTED, local: null, remotes: [] }), true);
    assert.equal(notified, 1);
    const snapshot = store.get();
    assert.equal(store.get(), snapshot);
    unsubscribe();
    store.update({ connection: IDLE, local: null, remotes: [] });
    assert.equal(notified, 1);
  });
});
