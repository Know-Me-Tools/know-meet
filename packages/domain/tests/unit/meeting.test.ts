// wr02 task 2.1: room code, display name, participant and connection-state rules.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isInRoom,
  type LocalParticipant,
  parseDisplayName,
  parseRoomCode,
  toParticipantIdentity,
  withLocalTrackMuted,
} from "../../src/index.ts";

describe("parseRoomCode", () => {
  it("accepts the service's code shape", () => {
    assert.equal(parseRoomCode("km-4fq-82x"), "km-4fq-82x");
  });

  it("trims and lowercases a typed code", () => {
    assert.equal(parseRoomCode("  KM-4FQ-82X\n"), "km-4fq-82x");
  });

  it("rejects anything else", () => {
    for (const value of ["", "km-4fq-82", "km-4fq-82xx", "xx-4fq-82x", "km_4fq_82x", 42, null]) {
      assert.equal(parseRoomCode(value), null, `rejects ${String(value)}`);
    }
  });
});

describe("parseDisplayName", () => {
  it("trims and accepts 1 to 60 code points", () => {
    assert.equal(parseDisplayName("  Sam Patel "), "Sam Patel");
    assert.equal(parseDisplayName("x".repeat(60)), "x".repeat(60));
    assert.equal(parseDisplayName("\u{1F600}".repeat(60)), "\u{1F600}".repeat(60));
  });

  it("rejects blank, too long and non-string input", () => {
    assert.equal(parseDisplayName("   "), null);
    assert.equal(parseDisplayName("x".repeat(61)), null);
    assert.equal(parseDisplayName(undefined), null);
  });
});

describe("withLocalTrackMuted", () => {
  it("returns a copy and leaves the original unchanged", () => {
    const local: LocalParticipant = {
      kind: "local",
      identity: toParticipantIdentity("guest-1"),
      displayName: "Guest A",
      microphone: { muted: true },
      camera: { muted: true },
    };
    const unmuted = withLocalTrackMuted(local, "microphone", false);
    assert.deepEqual(unmuted.microphone, { muted: false });
    assert.deepEqual(unmuted.camera, { muted: true });
    assert.deepEqual(local.microphone, { muted: true });
    assert.notEqual(unmuted, local);
  });
});

describe("isInRoom", () => {
  it("is true while connected or reconnecting only", () => {
    assert.equal(isInRoom({ status: "connected" }), true);
    assert.equal(isInRoom({ status: "reconnecting" }), true);
    assert.equal(isInRoom({ status: "connecting" }), false);
    assert.equal(isInRoom({ status: "idle" }), false);
    assert.equal(isInRoom({ status: "disconnected", reason: "connection-lost" }), false);
  });
});
