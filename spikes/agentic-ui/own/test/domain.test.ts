/** Pure domain tests (node --test; Node >= 24 runs .ts directly). No React, no SDKs. */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { AgUiDomainEvent } from "../src/domain/agui-event.ts";
import { transition } from "../src/domain/hitl-machine.ts";
import { applyPatch } from "../src/domain/json-patch.ts";
import { emptyTranscript, type TranscriptState } from "../src/domain/transcript-model.ts";
import { applyHitl, reduceAgentEvent, type ReduceContext } from "../src/domain/transcript-reducer.ts";

const ctx: ReduceContext = { classifyCustom: (name, value) => ({ name, rendering: "fallback", value }) };

function run(events: readonly AgUiDomainEvent[], start: TranscriptState = emptyTranscript("t")): TranscriptState {
  return events.reduce((s, e) => reduceAgentEvent(s, e, ctx), start);
}

const started: AgUiDomainEvent = { type: "RUN_STARTED", threadId: "t", runId: "r" };

test("text deltas accumulate and RUN_FINISHED completes the message", () => {
  const s = run([
    started,
    { type: "TEXT_MESSAGE_START", messageId: "m", role: "assistant" },
    { type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: "Hello" },
    { type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: " world" },
    { type: "RUN_FINISHED", threadId: "t", runId: "r" },
  ]);
  assert.equal(s.messages["m"]?.text, "Hello world");
  assert.equal(s.messages["m"]?.status, "complete");
  assert.equal(s.runStatus, "finished");
});

test("ordering violations are protocol errors and never change text", () => {
  const s = run([
    started,
    { type: "TEXT_MESSAGE_CONTENT", messageId: "ghost", delta: "GHOST" },
    { type: "TEXT_MESSAGE_START", messageId: "m" },
    { type: "TEXT_MESSAGE_END", messageId: "m" },
    { type: "TEXT_MESSAGE_START", messageId: "m" },
    { type: "RUN_FINISHED", threadId: "t", runId: "r" },
    { type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: "AFTER" },
  ]);
  assert.deepEqual(s.protocolErrors.map((e) => e.code), ["unknown-message", "duplicate-message", "event-outside-run"]);
  assert.equal(s.messages["m"]?.text, "");
  assert.equal(s.messages["ghost"], undefined);
});

test("chunked tool calls assemble and close when another event arrives", () => {
  const s = run([
    started,
    { type: "TOOL_CALL_CHUNK", toolCallId: "tc", toolCallName: "weather", delta: '{"city":' },
    { type: "TOOL_CALL_CHUNK", toolCallId: "tc", delta: '"Lisbon"}' },
    { type: "TOOL_CALL_RESULT", messageId: "res", toolCallId: "tc", content: "19" },
  ]);
  assert.deepEqual(s.toolCalls["tc"]?.args, { city: "Lisbon" });
  assert.equal(s.toolCalls["tc"]?.status, "complete");
});

test("an interrupt gates its tool call; approval is idempotent and yields one resume", () => {
  const interrupted = run([
    started,
    { type: "TOOL_CALL_START", toolCallId: "tc", toolCallName: "send" },
    { type: "TOOL_CALL_END", toolCallId: "tc" },
    { type: "RUN_FINISHED", threadId: "t", runId: "r", outcome: { type: "interrupt", interrupts: [{ id: "i", reason: "tool_call", toolCallId: "tc" }] } },
  ]);
  assert.equal(interrupted.runStatus, "interrupted");
  assert.equal(interrupted.toolCalls["tc"]?.status, "pending-approval");
  const first = applyHitl(interrupted, "i", "approve", 0);
  assert.deepEqual(first.resume, { interruptId: "i", status: "resolved", payload: { approved: true } });
  const second = applyHitl(first.state, "i", "approve", 0);
  assert.equal(second.accepted, false);
  assert.equal(second.resume, null);
});

test("a decision after expiresAt expires instead of resolving", () => {
  const pending = { id: "i", reason: "tool_call", status: "pending" as const, expiresAtMs: 1_000 };
  const late = transition(pending, "approve", 1_000);
  assert.equal(late.status, "expired");
  assert.equal(late.resume, null);
  assert.equal(transition({ ...pending, status: "approved" }, "resume-failed", 0).status, "failed");
});

test("JSON patch supports test, move, copy and remove without mutating input", () => {
  const doc = { a: [1, 2, 3], phase: "x" };
  const r = applyPatch(doc, [
    { op: "test", path: "/phase", value: "x" },
    { op: "move", from: "/a/2", path: "/a/0" },
    { op: "copy", from: "/phase", path: "/last" },
    { op: "remove", path: "/last" },
  ]);
  assert.ok(r.ok);
  assert.deepEqual(r.ok ? r.value : null, { a: [3, 1, 2], phase: "x" });
  assert.deepEqual(doc, { a: [1, 2, 3], phase: "x" });
  assert.equal(applyPatch(doc, [{ op: "test", path: "/phase", value: "y" }]).ok, false);
});
