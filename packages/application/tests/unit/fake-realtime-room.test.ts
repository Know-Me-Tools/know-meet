// wr02 task 2.2: the in-memory RealtimeRoom keeps the port's snapshot and attach contract.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDisplayName, type RemoteParticipant, toParticipantIdentity } from "@know-meet/domain";
import { createFakeRealtimeRoom, createFakeTokenIssuer } from "../../src/fakes.ts";

function remote(identity: string, microphoneMuted: boolean): RemoteParticipant {
  return {
    kind: "remote",
    identity: toParticipantIdentity(identity),
    displayName: identity,
    microphone: { muted: microphoneMuted, subscribed: !microphoneMuted },
    camera: { muted: false, subscribed: true },
  };
}

async function connectedRoom() {
  const issuer = createFakeTokenIssuer();
  const created = await issuer.createMeeting();
  assert.ok(created.ok);
  const displayName = parseDisplayName("Guest A");
  assert.ok(displayName !== null);
  const token = await issuer.requestToken({ code: created.value, displayName });
  assert.ok(token.ok);
  const room = createFakeRealtimeRoom();
  await room.connect(token.value);
  return room;
}

describe("fake realtime room", () => {
  it("returns the same snapshot until something changes, then notifies", async () => {
    const room = await connectedRoom();
    const before = room.getSnapshot();
    assert.equal(room.getSnapshot(), before);
    let notified = 0;
    const unsubscribe = room.subscribe(() => {
      notified += 1;
    });
    room.setRemote(remote("guest-b", false));
    assert.notEqual(room.getSnapshot(), before);
    assert.equal(notified, 1);
    unsubscribe();
    room.removeRemote(toParticipantIdentity("guest-b"));
    assert.equal(notified, 1);
    assert.deepEqual(room.getSnapshot().remotes, []);
  });

  it("replaces a remote participant in place and keeps join order", async () => {
    const room = await connectedRoom();
    room.setRemote(remote("guest-b", false));
    room.setRemote(remote("guest-c", false));
    room.setRemote(remote("guest-b", true));
    const remotes = room.getSnapshot().remotes;
    assert.deepEqual(
      remotes.map((entry) => entry.identity),
      ["guest-b", "guest-c"],
    );
    assert.equal(remotes[0]?.microphone.muted, true);
  });

  it("records media bindings until they are detached", async () => {
    const room = await connectedRoom();
    const element = {} as HTMLMediaElement;
    const target = { identity: toParticipantIdentity("guest-b"), kind: "camera" as const };
    const detach = room.attachMedia(target, element);
    assert.deepEqual(room.attachments(), [{ target, element }]);
    detach();
    assert.deepEqual(room.attachments(), []);
  });

  it("moves through reconnecting and a lost connection", async () => {
    const room = await connectedRoom();
    room.setConnection({ status: "reconnecting" });
    assert.equal(room.getSnapshot().connection.status, "reconnecting");
    room.setConnection({ status: "disconnected", reason: "connection-lost" });
    const result = await room.setMediaEnabled("microphone", true);
    assert.deepEqual(result, { ok: false, error: { code: "connection-lost" } });
  });
});
