// wr04 task 4.1: SDK facts become domain snapshots with stable references.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type ConnectionState,
  DEFAULT_ACTIVE_DEVICES,
  NO_BACKGROUND_EFFECT_STATE,
  NOTHING_SUPPORTED,
} from "@know-meet/domain";
import {
  CONNECTED,
  CONNECTION_LOST,
  IDLE,
  LEFT,
  RECONNECTING,
  toLiveConnection,
} from "../../src/realtime-room/domain/connection-mapping.ts";
import {
  INITIAL_SNAPSHOT,
  nextSnapshot,
  type ParticipantFacts,
  type RoomFacts,
  UNPUBLISHED,
} from "../../src/realtime-room/domain/snapshot-mapping.ts";

function participant(identity: string, microphoneMuted = false, name?: string): ParticipantFacts {
  return {
    identity,
    name,
    microphone: { muted: microphoneMuted, subscribed: true },
    camera: { muted: false, subscribed: true },
  };
}

function facts(
  connection: ConnectionState,
  remotes: readonly ParticipantFacts[] = [],
  local: ParticipantFacts | null = participant("guest-a"),
): RoomFacts {
  return {
    connection,
    local,
    remotes,
    screenShares: [],
    chat: INITIAL_SNAPSHOT.chat,
    availableDevices: INITIAL_SNAPSHOT.devices.available,
    activeDevices: DEFAULT_ACTIVE_DEVICES,
    audioPlayback: "allowed",
    backgroundEffect: NO_BACKGROUND_EFFECT_STATE,
    support: NOTHING_SUPPORTED,
  };
}

describe("snapshot mapping", () => {
  it("returns the previous snapshot when nothing changed", () => {
    const first = nextSnapshot(INITIAL_SNAPSHOT, facts(CONNECTED, [participant("guest-b")]));
    const second = nextSnapshot(first, facts(CONNECTED, [participant("guest-b")]));
    assert.equal(second, first);
    assert.equal(nextSnapshot(INITIAL_SNAPSHOT, facts(IDLE, [], null)), INITIAL_SNAPSHOT);
  });

  it("keeps unchanged participants by reference and replaces the changed one", () => {
    const first = nextSnapshot(
      INITIAL_SNAPSHOT,
      facts(CONNECTED, [participant("guest-b"), participant("guest-c")]),
    );
    const second = nextSnapshot(
      first,
      facts(CONNECTED, [participant("guest-b", true), participant("guest-c")]),
    );
    assert.notEqual(second, first);
    assert.equal(second.local, first.local);
    assert.notEqual(second.remotes[0], first.remotes[0]);
    assert.equal(second.remotes[0]?.microphone.muted, true);
    assert.equal(second.remotes[1], first.remotes[1]);
  });

  it("keeps join order and appends newcomers", () => {
    const first = nextSnapshot(INITIAL_SNAPSHOT, facts(CONNECTED, [participant("guest-b")]));
    const second = nextSnapshot(
      first,
      facts(CONNECTED, [participant("guest-c"), participant("guest-b")]),
    );
    assert.deepEqual(
      second.remotes.map((entry) => entry.identity),
      ["guest-b", "guest-c"],
    );
  });

  it("drops a remote that left and reports zero remotes", () => {
    const first = nextSnapshot(INITIAL_SNAPSHOT, facts(CONNECTED, [participant("guest-b")]));
    const second = nextSnapshot(first, facts(CONNECTED, []));
    assert.deepEqual(second.remotes, []);
  });

  it("maps an unpublished track to muted and unsubscribed", () => {
    const silent: ParticipantFacts = { ...participant("guest-b"), microphone: UNPUBLISHED };
    const snapshot = nextSnapshot(INITIAL_SNAPSHOT, facts(CONNECTED, [silent]));
    assert.deepEqual(snapshot.remotes[0]?.microphone, { muted: true, subscribed: false });
  });

  it("falls back to the identity when the name is missing or empty", () => {
    const snapshot = nextSnapshot(
      INITIAL_SNAPSHOT,
      facts(CONNECTED, [participant("guest-b", false, ""), participant("guest-c", false, "Cy")]),
    );
    assert.deepEqual(
      snapshot.remotes.map((entry) => entry.displayName),
      ["guest-b", "Cy"],
    );
  });

  it("keeps participants while reconnecting and clears them once disconnected", () => {
    const connected = nextSnapshot(INITIAL_SNAPSHOT, facts(CONNECTED, [participant("guest-b")]));
    const reconnecting = nextSnapshot(connected, facts(RECONNECTING, [participant("guest-b")]));
    assert.equal(reconnecting.local, connected.local);
    assert.equal(reconnecting.remotes, connected.remotes);
    const lost = nextSnapshot(reconnecting, facts(CONNECTION_LOST, [participant("guest-b")]));
    assert.equal(lost.local, null);
    assert.deepEqual(lost.remotes, []);
    assert.deepEqual(lost.connection, { status: "disconnected", reason: "connection-lost" });
  });

  it("treats leaving and losing the connection as different states", () => {
    const left = nextSnapshot(INITIAL_SNAPSHOT, facts(LEFT, [], null));
    const lost = nextSnapshot(left, facts(CONNECTION_LOST, [], null));
    assert.notEqual(lost, left);
  });

  it("maps the local participant with its own mute state", () => {
    const local: ParticipantFacts = { ...participant("guest-a", true), camera: UNPUBLISHED };
    const snapshot = nextSnapshot(INITIAL_SNAPSHOT, facts(CONNECTED, [], local));
    assert.deepEqual(snapshot.local, {
      kind: "local",
      identity: "guest-a",
      displayName: "guest-a",
      microphone: { muted: true },
      camera: { muted: true },
    });
  });
});

describe("connection mapping", () => {
  it("maps live SDK states and leaves the end of a session to the adapter", () => {
    assert.deepEqual(toLiveConnection("connecting"), { status: "connecting" });
    assert.deepEqual(toLiveConnection("connected"), { status: "connected" });
    assert.deepEqual(toLiveConnection("reconnecting"), { status: "reconnecting" });
    assert.deepEqual(toLiveConnection("signalReconnecting"), { status: "reconnecting" });
    assert.equal(toLiveConnection("disconnected"), null);
  });
});
