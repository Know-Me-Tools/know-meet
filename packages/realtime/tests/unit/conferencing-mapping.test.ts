// wc03 tasks 3.2 to 3.5: the SDK-free rules behind share, chat, devices and effects.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BACKGROUND_BLUR,
  EVERYONE,
  NO_BACKGROUND_EFFECT,
  privateTo,
  type RemoteParticipant,
  toParticipantIdentity,
} from "@know-meet/domain";
import { planBackgroundEffect } from "../../src/realtime-room/domain/background-effect-plan.ts";
import {
  AUDIENCE_ATTRIBUTE,
  CHAT_TOPIC,
  CONSENT_TOPIC,
  textSendOptions,
  toReceivedChat,
} from "../../src/realtime-room/domain/chat-codec.ts";
import { toMediaDevices } from "../../src/realtime-room/domain/device-mapping.ts";
import { nextScreenShares } from "../../src/realtime-room/domain/screen-share-mapping.ts";

const BOB = toParticipantIdentity("guest-bob");
const ME = toParticipantIdentity("guest-me");

describe("chat send options (privacy boundary, WC-3)", () => {
  it("sends a private message to exactly its one recipient", () => {
    const options = textSendOptions(CHAT_TOPIC, privateTo(BOB));
    assert.deepEqual(options.destinationIdentities, ["guest-bob"]);
    assert.equal(options.attributes[AUDIENCE_ATTRIBUTE], "private");
  });

  it("sends a message to everyone without a destination list", () => {
    const options = textSendOptions(CHAT_TOPIC, EVERYONE);
    assert.equal(options.destinationIdentities, undefined);
    assert.equal(options.attributes[AUDIENCE_ATTRIBUTE], "everyone");
  });

  it("keeps chat and consent on different topics", () => {
    assert.notEqual(CHAT_TOPIC, CONSENT_TOPIC);
  });
});

describe("received chat", () => {
  const base = {
    streamId: "stream-1",
    timestamp: 1_700_000_000_000,
    from: "guest-bob",
    fromName: "Bob",
    text: "  hello  ",
    localIdentity: ME,
  };

  it("labels a stream marked private as private to this client", () => {
    const message = toReceivedChat({ ...base, attributes: { [AUDIENCE_ATTRIBUTE]: "private" } });
    assert.deepEqual(message?.audience, privateTo(ME));
    assert.equal(message?.text, "hello");
    assert.equal(message?.id, "stream-1");
    assert.equal(message?.sentAt, base.timestamp);
  });

  it("labels an unmarked stream as everyone and drops empty text", () => {
    assert.deepEqual(toReceivedChat({ ...base, attributes: undefined })?.audience, EVERYONE);
    assert.equal(toReceivedChat({ ...base, attributes: undefined, text: "   " }), null);
  });
});

describe("device list", () => {
  it("maps kinds, skips id-less entries and marks the first of each kind default", () => {
    const devices = toMediaDevices([
      { kind: "audioinput", deviceId: "default", label: "Default" },
      { kind: "audioinput", deviceId: "mic-2", label: "USB" },
      { kind: "videoinput", deviceId: "", label: "" },
      { kind: "audiooutput", deviceId: "spk-1", label: "Speakers" },
    ]);
    assert.deepEqual(
      devices.map((device) => [device.kind, device.id, device.isDefault]),
      [
        ["microphone", "default", true],
        ["microphone", "mic-2", false],
        ["speaker", "spk-1", true],
      ],
    );
  });
});

describe("screen shares", () => {
  const remote = (identity: string): RemoteParticipant => ({
    kind: "remote",
    identity: toParticipantIdentity(identity),
    displayName: identity,
    microphone: { muted: true, subscribed: false },
    camera: { muted: true, subscribed: false },
  });

  it("puts the local share first, then remote shares in join order, and reuses entries", () => {
    const remotes = [remote("guest-a"), remote("guest-b")];
    const facts = [
      { identity: "guest-b", isLocal: false, subscribed: true, hasAudio: false },
      { identity: "guest-me", isLocal: true, subscribed: true, hasAudio: true },
      { identity: "guest-a", isLocal: false, subscribed: false, hasAudio: false },
    ];
    const first = nextScreenShares([], facts, remotes);
    assert.deepEqual(
      first.map((share) => share.identity),
      ["guest-me", "guest-a", "guest-b"],
    );
    assert.equal(nextScreenShares(first, facts, remotes), first);
  });
});

describe("background effect plan (WC-4)", () => {
  const facts = {
    requested: BACKGROUND_BLUR,
    camera: "on" as const,
    appliedHere: false,
    processorHere: false,
    failedHere: false,
  };

  it("applies to a camera track without the effect, including a replaced one", () => {
    assert.deepEqual(planBackgroundEffect(facts), { action: "apply", status: "applying" });
  });

  it("waits while the camera is off and keeps an applied effect", () => {
    assert.equal(planBackgroundEffect({ ...facts, camera: "off" }).status, "pending");
    assert.deepEqual(planBackgroundEffect({ ...facts, appliedHere: true, processorHere: true }), {
      action: "none",
      status: "active",
    });
  });

  it("does not retry a failure on the same track, and removes on none", () => {
    assert.equal(planBackgroundEffect({ ...facts, failedHere: true }).action, "none");
    assert.deepEqual(
      planBackgroundEffect({ ...facts, requested: NO_BACKGROUND_EFFECT, processorHere: true }),
      { action: "remove", status: "idle" },
    );
  });
});
