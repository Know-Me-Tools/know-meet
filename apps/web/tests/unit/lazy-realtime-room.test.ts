// TJ-ARCH-MOB-001 compliant
// wr04 4.2: the lazy room loads the media package on the first connect and carries
// listeners and media bindings over to it.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { RealtimeRoom, RoomCredentials } from "@know-meet/application";
import { createFakeRealtimeRoom } from "@know-meet/application/fakes";
import { parseRoomCode, toParticipantIdentity } from "@know-meet/domain";
import { createLazyRealtimeRoom } from "../../src/infrastructure/meeting/lazy-realtime-room.ts";

const ROOM = parseRoomCode("km-4fq-82x");
if (ROOM === null) throw new Error("fixture code must parse");
const CREDENTIALS: RoomCredentials = {
  url: "wss://media.example",
  token: "jwt-value",
  identity: toParticipantIdentity("guest-1"),
  room: ROOM,
  expiresIn: 600,
};

/** The application fake (full port, current snapshot shape) with subscriber counting. */
function fakeRoom() {
  const fake = createFakeRealtimeRoom();
  let subscribers = 0;
  const room: RealtimeRoom = {
    ...fake,
    subscribe: (listener) => {
      subscribers += 1;
      const unsubscribe = fake.subscribe(listener);
      return () => {
        subscribers -= 1;
        unsubscribe();
      };
    },
  };
  return { room, fake, subscribers: () => subscribers };
}

test("before connect it is idle, stable, has no background effect and loads nothing", () => {
  let loads = 0;
  const lazy = createLazyRealtimeRoom(async () => {
    loads += 1;
    return fakeRoom().room;
  });
  assert.equal(lazy.getSnapshot(), lazy.getSnapshot());
  assert.equal(lazy.getSnapshot().connection.status, "idle");
  assert.equal(loads, 0);
  assert.equal(lazy.getSnapshot().backgroundEffect.effect.kind, "none");
});

test("the first connect loads once, adopts listeners and bindings, then delegates", async () => {
  const fake = fakeRoom();
  let loads = 0;
  const lazy = createLazyRealtimeRoom(async () => {
    loads += 1;
    return fake.room;
  });
  let notified = 0;
  lazy.subscribe(() => {
    notified += 1;
  });
  const element = {} as HTMLMediaElement;
  lazy.attachMedia({ identity: toParticipantIdentity("p1"), kind: "camera" }, element);
  const [first, second] = await Promise.all([lazy.connect(CREDENTIALS), lazy.connect(CREDENTIALS)]);
  assert.equal(first.ok && second.ok, true);
  assert.equal(loads, 1);
  assert.equal(notified, 1);
  assert.equal(fake.subscribers(), 1);
  assert.deepEqual(
    fake.fake.attachments().map((attachment) => attachment.target.identity),
    ["p1"],
  );
  assert.equal(lazy.getSnapshot(), fake.fake.getSnapshot());
});

test("a failed load is connection-lost and the next connect retries", async () => {
  let loads = 0;
  const fake = fakeRoom();
  const lazy = createLazyRealtimeRoom(async () => {
    loads += 1;
    if (loads === 1) throw new Error("chunk failed");
    return fake.room;
  });
  assert.deepEqual(await lazy.connect(CREDENTIALS), {
    ok: false,
    error: { code: "connection-lost" },
  });
  assert.equal((await lazy.connect(CREDENTIALS)).ok, true);
  assert.equal(loads, 2);
});

test("mute before the room exists is connection-lost", async () => {
  const lazy = createLazyRealtimeRoom(async () => fakeRoom().room);
  assert.deepEqual(await lazy.setMediaEnabled("microphone", true), {
    ok: false,
    error: { code: "connection-lost" },
  });
});
