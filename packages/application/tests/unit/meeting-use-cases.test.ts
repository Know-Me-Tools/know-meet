// wr02 task 2.2: start, join, leave and mute against the RealtimeRoom and TokenIssuer ports.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { meetingErrors, parseRoomCode, type RoomCode } from "@know-meet/domain";
import { createFakeRealtimeRoom, createFakeTokenIssuer } from "../../src/fakes.ts";
import { createMeetingUseCases, type JoinRequest } from "../../src/index.ts";

function roomCode(value: string): RoomCode {
  const code = parseRoomCode(value);
  assert.ok(code !== null, `fixture code ${value} must be well formed`);
  return code;
}

const ISSUED = roomCode("km-abc-123");
const NEVER_ISSUED = roomCode("km-zzz-999");

function setup() {
  const issuer = createFakeTokenIssuer({ seededCodes: [ISSUED] });
  const room = createFakeRealtimeRoom();
  const meeting = createMeetingUseCases({ issuer, room });
  return { issuer, room, meeting };
}

function joinRequest(overrides: Partial<JoinRequest> = {}): JoinRequest {
  return {
    code: ISSUED,
    displayName: "Guest B",
    microphoneEnabled: false,
    cameraEnabled: false,
    ...overrides,
  };
}

describe("start", () => {
  it("returns a new code from the issuer and connects nothing", async () => {
    const { issuer, room, meeting } = setup();
    const result = await meeting.start();
    assert.ok(result.ok);
    assert.match(result.value, /^km-[a-z0-9]{3}-[a-z0-9]{3}$/);
    assert.ok(issuer.issued().includes(result.value));
    assert.equal(room.connectCalls().length, 0);
  });

  it("reports rate-limited from the issuer", async () => {
    const { issuer, meeting } = setup();
    issuer.failNextCreate(meetingErrors.rateLimited(30));
    const result = await meeting.start();
    assert.deepEqual(result, { ok: false, error: { code: "rate-limited", retryAfterSeconds: 30 } });
  });
});

describe("join", () => {
  it("asks the issuer for a token and connects with those credentials", async () => {
    const { issuer, room, meeting } = setup();
    const result = await meeting.join(joinRequest());
    assert.ok(result.ok);
    assert.equal(result.value.code, ISSUED);
    assert.deepEqual(issuer.tokenRequests(), [{ code: ISSUED, displayName: "Guest B" }]);
    const [credentials] = room.connectCalls();
    assert.ok(credentials !== undefined);
    assert.equal(credentials.room, ISSUED);
    assert.equal(result.value.identity, credentials.identity);
    assert.equal(room.getSnapshot().connection.status, "connected");
  });

  it("normalises a typed code and trims the name before asking for a token", async () => {
    const { issuer, meeting } = setup();
    const result = await meeting.join(joinRequest({ code: "  KM-ABC-123 ", displayName: " Sam " }));
    assert.equal(result.ok, true);
    assert.deepEqual(issuer.tokenRequests(), [{ code: ISSUED, displayName: "Sam" }]);
  });

  it("reports meeting-not-found for a code never issued and does not connect", async () => {
    const { issuer, room, meeting } = setup();
    const result = await meeting.join(joinRequest({ code: NEVER_ISSUED }));
    assert.deepEqual(result, { ok: false, error: { code: "meeting-not-found" } });
    assert.equal(issuer.tokenRequests().length, 1);
    assert.equal(room.connectCalls().length, 0);
    assert.equal(room.getSnapshot().connection.status, "idle");
  });

  it("reports meeting-not-found for a malformed code without asking the issuer", async () => {
    const { issuer, room, meeting } = setup();
    const result = await meeting.join(joinRequest({ code: "not a code" }));
    assert.deepEqual(result, { ok: false, error: { code: "meeting-not-found" } });
    assert.equal(issuer.tokenRequests().length, 0);
    assert.equal(room.connectCalls().length, 0);
  });

  it("reports invalid-request for a blank or too long name without asking the issuer", async () => {
    const { issuer, meeting } = setup();
    const blank = await meeting.join(joinRequest({ displayName: "   " }));
    const long = await meeting.join(joinRequest({ displayName: "x".repeat(61) }));
    assert.deepEqual(blank, { ok: false, error: { code: "invalid-request" } });
    assert.deepEqual(long, { ok: false, error: { code: "invalid-request" } });
    assert.equal(issuer.tokenRequests().length, 0);
  });

  it("does not connect when the issuer is rate limiting", async () => {
    const { issuer, room, meeting } = setup();
    issuer.failNextToken(meetingErrors.rateLimited(null));
    const result = await meeting.join(joinRequest());
    const expected = { code: "rate-limited", retryAfterSeconds: null };
    assert.deepEqual(result, { ok: false, error: expected });
    assert.equal(room.connectCalls().length, 0);
  });

  it("reports the room's connect error and leaves the room idle", async () => {
    const { room, meeting } = setup();
    room.failNextConnect(meetingErrors.forbidden());
    const result = await meeting.join(joinRequest());
    assert.deepEqual(result, { ok: false, error: { code: "forbidden" } });
    assert.equal(room.getSnapshot().connection.status, "idle");
  });

  it("enables the chosen devices and lists the ones the browser refused", async () => {
    const { room, meeting } = setup();
    room.denyPermission("camera");
    const request = joinRequest({ microphoneEnabled: true, cameraEnabled: true });
    const result = await meeting.join(request);
    assert.ok(result.ok);
    assert.deepEqual(result.value.deniedDevices, ["camera"]);
    const local = room.getSnapshot().local;
    assert.ok(local !== null);
    assert.equal(local.microphone.muted, false);
    assert.equal(local.camera.muted, true);
  });

  it("leaves both devices off when the lobby chose off", async () => {
    const { room, meeting } = setup();
    const result = await meeting.join(joinRequest());
    assert.ok(result.ok);
    assert.deepEqual(result.value.deniedDevices, []);
    assert.deepEqual(room.getSnapshot().local?.microphone, { muted: true });
    assert.deepEqual(room.getSnapshot().local?.camera, { muted: true });
  });
});

describe("mute", () => {
  it("mutes and unmutes the microphone and the camera", async () => {
    const { room, meeting } = setup();
    await meeting.join(joinRequest({ microphoneEnabled: true, cameraEnabled: true }));
    assert.deepEqual(await meeting.setMuted("microphone", true), { ok: true, value: undefined });
    assert.equal(room.getSnapshot().local?.microphone.muted, true);
    await meeting.setMuted("camera", true);
    assert.equal(room.getSnapshot().local?.camera.muted, true);
    await meeting.setMuted("camera", false);
    assert.equal(room.getSnapshot().local?.camera.muted, false);
  });

  it("toggles from the current state", async () => {
    const { room, meeting } = setup();
    await meeting.join(joinRequest({ microphoneEnabled: true }));
    await meeting.toggleMuted("microphone");
    assert.equal(room.getSnapshot().local?.microphone.muted, true);
    await meeting.toggleMuted("microphone");
    assert.equal(room.getSnapshot().local?.microphone.muted, false);
  });

  it("reports connection-lost when not in a room", async () => {
    const { meeting } = setup();
    const expected = { ok: false, error: { code: "connection-lost" } };
    assert.deepEqual(await meeting.setMuted("microphone", true), expected);
    assert.deepEqual(await meeting.toggleMuted("camera"), expected);
  });

  it("reports permission-denied when unmuting a refused device", async () => {
    const { room, meeting } = setup();
    room.denyPermission("microphone");
    await meeting.join(joinRequest());
    const result = await meeting.setMuted("microphone", false);
    assert.deepEqual(result, {
      ok: false,
      error: { code: "permission-denied", device: "microphone" },
    });
  });
});

describe("leave", () => {
  it("disconnects and clears the local participant", async () => {
    const { room, meeting } = setup();
    await meeting.join(joinRequest());
    await meeting.leave();
    const snapshot = room.getSnapshot();
    assert.deepEqual(snapshot.connection, { status: "disconnected", reason: "left" });
    assert.equal(snapshot.local, null);
    assert.deepEqual(snapshot.remotes, []);
  });
});
