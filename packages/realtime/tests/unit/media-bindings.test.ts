// wr04 task 4.1: media bindings survive track replacement and detach cleanly.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MediaTarget } from "@know-meet/application";
import { toParticipantIdentity } from "@know-meet/domain";
import {
  type AttachableTrack,
  createMediaBindings,
  type TrackResolver,
} from "../../src/realtime-room/application/media-bindings.ts";

interface RecordingTrack extends AttachableTrack {
  readonly calls: string[];
}

function track(name: string): RecordingTrack {
  const calls: string[] = [];
  return {
    calls,
    attach: () => {
      calls.push(`${name}:attach`);
    },
    detach: () => {
      calls.push(`${name}:detach`);
    },
  };
}

const target: MediaTarget = { identity: toParticipantIdentity("guest-b"), kind: "camera" };
const element = {} as HTMLMediaElement;
const resolveTo =
  (value: AttachableTrack | null): TrackResolver =>
  () =>
    value;

describe("media bindings", () => {
  it("attaches later when bound before the track exists", () => {
    const bindings = createMediaBindings();
    const first = track("first");
    bindings.bind(target, element, resolveTo(null));
    assert.deepEqual(first.calls, []);
    bindings.reconcile(resolveTo(first));
    assert.deepEqual(first.calls, ["first:attach"]);
  });

  it("does nothing when the resolved track is unchanged", () => {
    const bindings = createMediaBindings();
    const first = track("first");
    bindings.bind(target, element, resolveTo(first));
    bindings.reconcile(resolveTo(first));
    assert.deepEqual(first.calls, ["first:attach"]);
  });

  it("moves to the new track after unsubscribe and resubscribe", () => {
    const bindings = createMediaBindings();
    const first = track("first");
    const second = track("second");
    bindings.bind(target, element, resolveTo(first));
    bindings.reconcile(resolveTo(null));
    bindings.reconcile(resolveTo(second));
    assert.deepEqual(first.calls, ["first:attach", "first:detach"]);
    assert.deepEqual(second.calls, ["second:attach"]);
  });

  it("detaches the old track before attaching a replacement", () => {
    const bindings = createMediaBindings();
    const order: string[] = [];
    const record = (name: string): AttachableTrack => ({
      attach: () => order.push(`${name}:attach`),
      detach: () => order.push(`${name}:detach`),
    });
    const first = record("first");
    bindings.bind(target, element, resolveTo(first));
    bindings.reconcile(resolveTo(record("second")));
    assert.deepEqual(order, ["first:attach", "first:detach", "second:attach"]);
  });

  it("detaches once and stops following the target after the detach function runs", () => {
    const bindings = createMediaBindings();
    const first = track("first");
    const detach = bindings.bind(target, element, resolveTo(first));
    detach();
    detach();
    bindings.reconcile(resolveTo(track("second")));
    assert.deepEqual(first.calls, ["first:attach", "first:detach"]);
    assert.equal(bindings.count(), 0);
  });

  it("never attaches when the resolver withholds the track (the local microphone)", () => {
    const bindings = createMediaBindings();
    const detach = bindings.bind(
      { identity: toParticipantIdentity("guest-a"), kind: "microphone" },
      element,
      resolveTo(null),
    );
    assert.equal(bindings.count(), 1);
    detach();
    assert.equal(bindings.count(), 0);
  });
});
