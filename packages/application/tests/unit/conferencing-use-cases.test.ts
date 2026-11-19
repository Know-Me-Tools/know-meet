// wc02 tasks 2.2 and 2.3: chat audience, device choice on join. Authored under VLBV; first run
// is the wc11 boundary.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type ChatText,
  EVERYONE,
  type OutgoingChatMessage,
  parseRoomCode,
  privateTo,
  toDeviceId,
  toParticipantIdentity,
} from "@know-meet/domain";
import { createFakeRealtimeRoom, createFakeTokenIssuer } from "../../src/fakes.ts";
import { createConferencingUseCases, createMeetingUseCases } from "../../src/index.ts";

const CODE = parseRoomCode("km-abc-123");
const STRANGER = toParticipantIdentity("guest-gone");

async function joined() {
  assert.ok(CODE !== null);
  const room = createFakeRealtimeRoom();
  const issuer = createFakeTokenIssuer({ seededCodes: [CODE] });
  const meeting = createMeetingUseCases({ issuer, room });
  const conferencing = createConferencingUseCases(room);
  return { room, meeting, conferencing };
}

describe("chat audience", () => {
  it("is required by the type of an outgoing message", () => {
    // @ts-expect-error a message without an audience must not type-check (spec case 2)
    const missing: OutgoingChatMessage = { text: "hello" as ChatText };
    assert.ok(missing);
  });

  it("refuses a private message to someone not in the room and sends nothing", async () => {
    const { room, meeting, conferencing } = await joined();
    await meeting.join({
      code: "km-abc-123",
      displayName: "A",
      microphoneEnabled: false,
      cameraEnabled: false,
    });
    const result = await conferencing.sendChat("hi", privateTo(STRANGER));
    assert.deepEqual(result, { ok: false, error: { code: "recipient-not-present" } });
    assert.deepEqual(room.getSnapshot().chat, []);
  });

  it("refuses empty text", async () => {
    const { meeting, conferencing } = await joined();
    await meeting.join({
      code: "km-abc-123",
      displayName: "A",
      microphoneEnabled: false,
      cameraEnabled: false,
    });
    assert.deepEqual(await conferencing.sendChat("   ", EVERYONE), {
      ok: false,
      error: { code: "invalid-request" },
    });
  });
});

describe("lobby device choice", () => {
  it("is handed to the room on connect", async () => {
    const { room, meeting } = await joined();
    const microphone = toDeviceId("mic-2");
    const camera = toDeviceId("cam-3");
    await meeting.join({
      code: "km-abc-123",
      displayName: "A",
      microphoneEnabled: true,
      cameraEnabled: true,
      devices: { microphone, camera },
    });
    assert.deepEqual(room.connectOptions(), [{ devices: { microphone, camera } }]);
    assert.equal(room.getSnapshot().devices.active.microphone, microphone);
  });

  it("defaults to the system devices when no choice was made", async () => {
    const { room, meeting } = await joined();
    await meeting.join({
      code: "km-abc-123",
      displayName: "A",
      microphoneEnabled: false,
      cameraEnabled: false,
    });
    assert.deepEqual(room.connectOptions(), [{ devices: { microphone: null, camera: null } }]);
  });
});
