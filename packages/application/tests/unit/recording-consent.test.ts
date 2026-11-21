// wc02 task 2.4: recording consent (WC-8, WC-9, decision D2). Authored under VLBV; first run
// is the wc11 boundary.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type ConsentMessage,
  consentPrompt,
  isRecordingIndicatorOn,
  type ParticipantIdentity,
  parseRecordingRequestId,
  parseRoomCode,
  type RecordingRequestId,
  type RemoteParticipant,
  toParticipantIdentity,
} from "@know-meet/domain";
import { createFakeLocalRecorder, createFakeRealtimeRoom } from "../../src/fakes.ts";
import { createRecordingConsent } from "../../src/index.ts";

const A = toParticipantIdentity("guest-a");
const B = toParticipantIdentity("guest-b");
const C = toParticipantIdentity("guest-c");

function requestId(value: string): RecordingRequestId {
  const id = parseRecordingRequestId(value);
  assert.ok(id !== null, `fixture id ${value} must be well formed`);
  return id;
}

const FIRST = requestId("request-0001");

function remote(identity: ParticipantIdentity): RemoteParticipant {
  return {
    kind: "remote",
    identity,
    displayName: identity,
    microphone: { muted: true, subscribed: false },
    camera: { muted: true, subscribed: false },
  };
}

async function setup(remotes: readonly ParticipantIdentity[]) {
  const room = createFakeRealtimeRoom();
  const recorder = createFakeLocalRecorder();
  const code = parseRoomCode("km-abc-123");
  assert.ok(code !== null);
  await room.connect({
    url: "wss://media.fake.invalid",
    token: "t",
    identity: A,
    room: code,
    expiresIn: 600,
  });
  for (const identity of remotes) room.setRemote(remote(identity));
  const consent = createRecordingConsent({ room, recorder, newRequestId: () => FIRST });
  return { room, recorder, consent };
}

const sentTypes = (sent: readonly { message: ConsentMessage }[]): readonly string[] =>
  sent.map((entry) => entry.message.type);

describe("requesting a recording", () => {
  it("does not start before every present participant agreed", async () => {
    const { room, recorder, consent } = await setup([B, C]);
    assert.ok(consent.request().ok);
    await consent.settled();
    room.deliverConsent({
      from: B,
      message: { type: "record-answer", requestId: FIRST, answer: "agreed" },
    });
    await consent.settled();
    assert.equal(recorder.recording(), null);
    assert.equal(isRecordingIndicatorOn(consent.getSnapshot()), false);
    assert.deepEqual(sentTypes(room.sentConsent()), ["record-request"]);
  });

  it("announces, then starts, once the last participant agreed", async () => {
    const { room, recorder, consent } = await setup([B]);
    consent.request();
    room.deliverConsent({
      from: B,
      message: { type: "record-answer", requestId: FIRST, answer: "agreed" },
    });
    await consent.settled();
    assert.deepEqual(sentTypes(room.sentConsent()), ["record-request", "record-started"]);
    assert.equal(recorder.recording(), FIRST);
    assert.equal(consent.getSnapshot().status, "local-recording");
  });

  it("never records when someone declines, and tells the requester", async () => {
    const { room, recorder, consent } = await setup([B]);
    consent.request();
    room.deliverConsent({
      from: B,
      message: { type: "record-answer", requestId: FIRST, answer: "declined", reason: "person" },
    });
    await consent.settled();
    assert.deepEqual(recorder.started(), []);
    assert.deepEqual(consent.getSnapshot(), {
      status: "idle",
      notice: { kind: "declined", by: B, reason: "person" },
    });
    assert.deepEqual(sentTypes(room.sentConsent()), ["record-request", "record-withdrawn"]);
  });

  it("ignores an answer from someone who was not asked", async () => {
    const { room, recorder, consent } = await setup([B]);
    consent.request();
    room.deliverConsent({
      from: C,
      message: { type: "record-answer", requestId: FIRST, answer: "agreed" },
    });
    await consent.settled();
    assert.equal(recorder.recording(), null);
  });

  it("does not start the recorder when the start announcement fails", async () => {
    const { room, recorder, consent } = await setup([B]);
    consent.request();
    await consent.settled();
    room.failNextSend({ code: "send-failed" });
    room.deliverConsent({
      from: B,
      message: { type: "record-answer", requestId: FIRST, answer: "agreed" },
    });
    await consent.settled();
    assert.deepEqual(recorder.started(), []);
    assert.equal(isRecordingIndicatorOn(consent.getSnapshot()), false);
  });

  it("refuses a second request while one is under way", async () => {
    const { consent } = await setup([B]);
    consent.request();
    await consent.settled();
    assert.deepEqual(consent.request(), { ok: false, error: { code: "recording-busy" } });
  });
});

describe("late joiner (D2)", () => {
  async function recordingWithB() {
    const context = await setup([B]);
    context.consent.request();
    context.room.deliverConsent({
      from: B,
      message: { type: "record-answer", requestId: FIRST, answer: "agreed" },
    });
    await context.consent.settled();
    return context;
  }

  it("keeps recording and asks the late joiner", async () => {
    const { room, recorder, consent } = await recordingWithB();
    room.setRemote(remote(C));
    await consent.settled();
    const last = room.sentConsent().at(-1);
    assert.deepEqual(last, {
      message: { type: "record-request", requestId: FIRST, phase: "running" },
      to: { kind: "private", to: C },
    });
    assert.equal(recorder.recording(), FIRST);
  });

  it("stops for everyone and keeps the file when the late joiner declines", async () => {
    const { room, recorder, consent } = await recordingWithB();
    room.setRemote(remote(C));
    room.deliverConsent({
      from: C,
      message: { type: "record-answer", requestId: FIRST, answer: "declined", reason: "person" },
    });
    await consent.settled();
    assert.equal(recorder.recording(), null);
    assert.equal(recorder.finalised(), 1);
    assert.equal(room.sentConsent().at(-1)?.message.type, "record-stopped");
    assert.equal(isRecordingIndicatorOn(consent.getSnapshot()), false);
  });

  it("shows the indicator and a prompt to a participant who joins a running recording", async () => {
    const { room, consent } = await setup([B]);
    room.deliverConsent({
      from: B,
      message: { type: "record-request", requestId: FIRST, phase: "running" },
    });
    await consent.settled();
    assert.equal(isRecordingIndicatorOn(consent.getSnapshot()), true);
    assert.deepEqual(consentPrompt(consent.getSnapshot()), {
      requestId: FIRST,
      requester: B,
      running: true,
    });
  });
});

describe("answering", () => {
  it("sends the answer only to the requester", async () => {
    const { room, consent } = await setup([B, C]);
    room.deliverConsent({
      from: B,
      message: { type: "record-request", requestId: FIRST, phase: "asking" },
    });
    consent.answer("agreed");
    await consent.settled();
    assert.deepEqual(room.sentConsent(), [
      {
        message: { type: "record-answer", requestId: FIRST, answer: "agreed" },
        to: { kind: "private", to: B },
      },
    ]);
  });
});
