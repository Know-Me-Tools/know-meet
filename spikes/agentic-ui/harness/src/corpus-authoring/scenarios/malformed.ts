/**
 * Intentionally invalid stream: malformed frames and out-of-order events mixed
 * with valid ones. The prototype must not crash, must not render invalid
 * content, must record protocol errors, and must still render the valid message.
 */
import { EventType } from "@ag-ui/core";
import type { ScenarioFile, WireItem } from "../../domain/scenario.ts";
import { ev, runFinished, runStarted, textMessage, toolCallEnd } from "../event-builders.ts";
import { defineScenario, userTurn } from "../scenario-base.ts";

function invalid(event: Record<string, unknown>, note: string): WireItem {
  return { kind: "invalid-event", event, note };
}

export function malformedOutOfOrderScenario(): ScenarioFile {
  const prompt = "Stress test the stream.";
  const good = "This valid message must still render after the bad frames.";
  const items: WireItem[] = [
    runStarted(),
    // 1: content for a message that was never started (ordering)
    ev({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg-ghost", delta: "GHOST-TEXT-MUST-NOT-RENDER" }),
    // 2: non-JSON data frame
    { kind: "raw-sse", rawSse: "data: {this is not json\n\n", note: "invalid JSON payload" },
    // 3: unknown event type
    invalid({ type: "TEXT_MESSAGE_SHOUT", messageId: "msg-x", delta: "UNKNOWN-TYPE-MUST-NOT-RENDER" }, "unknown event type"),
    // 4: missing required field (delta)
    invalid({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg-bad-1" }, "TEXT_MESSAGE_CONTENT without delta"),
    // 5: wrong field type
    invalid({ type: EventType.TOOL_CALL_START, toolCallId: 42, toolCallName: "x" }, "toolCallId is a number"),
    // 6: args for an unknown tool call (ordering)
    ev({ type: EventType.TOOL_CALL_ARGS, toolCallId: "tc-ghost", delta: "{\"a\":1}" }),
    // 7: end for an unknown tool call (ordering)
    toolCallEnd("tc-ghost"),
    // 8..: a valid message
    ...textMessage("msg-good-1", good),
  ];
  const lastGood = items.length;
  items.push(
    // duplicate START for an already closed message id (ordering)
    ev({ type: EventType.TEXT_MESSAGE_START, messageId: "msg-good-1", role: "assistant" }),
    // empty data frame and an SSE comment (legal SSE, no event: must be ignored, not counted as errors)
    { kind: "raw-sse", rawSse: ": keep-alive comment\n\n", note: "SSE comment (valid, ignore)" },
    runFinished({ type: "success" }),
    // event after RUN_FINISHED (ordering)
    ev({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg-good-1", delta: " AFTER-FINISH-MUST-NOT-RENDER" }),
  );
  return defineScenario({
    id: "malformed-out-of-order",
    title: "Malformed and out-of-order events",
    description:
      "Invalid JSON, unknown event type, missing/wrong-typed fields, CONTENT before START, ARGS/END for unknown tool calls, " +
      "a duplicate START for a closed message and an event after RUN_FINISHED. Strings marked MUST-NOT-RENDER must never appear.",
    tags: ["@robustness", "@ordering"],
    userPrompt: prompt,
    validity: "intentionally-invalid",
    expectedInvalidItems: [1, 2, 3, 4, 5, 6, 7, lastGood, lastGood + 3],
    runs: [{ trigger: { kind: "initial" }, items }],
    expected: {
      runStatus: "finished",
      minProtocolErrors: 5,
      messages: [userTurn(prompt), { id: "msg-good-1", role: "assistant", textEquals: good, status: "complete" }],
      forbiddenText: [...MALFORMED_FORBIDDEN_TEXT],
    },
  });
}

/** Strings that must never be visible anywhere in the transcript. */
export const MALFORMED_FORBIDDEN_TEXT = ["GHOST-TEXT-MUST-NOT-RENDER", "UNKNOWN-TYPE-MUST-NOT-RENDER", "AFTER-FINISH-MUST-NOT-RENDER"] as const;
