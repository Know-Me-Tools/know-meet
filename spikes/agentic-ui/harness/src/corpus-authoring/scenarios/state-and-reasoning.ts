/** STATE_SNAPSHOT / STATE_DELTA, reasoning, subagents and MESSAGES_SNAPSHOT. */
import type { ScenarioFile } from "../../domain/scenario.ts";
import {
  messagesSnapshot,
  reasoning,
  reasoningChunk,
  reasoningEncrypted,
  runFinished,
  runStarted,
  stateDelta,
  stateSnapshot,
  subagentError,
  subagentFinished,
  subagentStarted,
  textMessage,
} from "../event-builders.ts";
import { defineScenario, userTurn } from "../scenario-base.ts";

export function stateSnapshotDeltaScenario(): ScenarioFile {
  const prompt = "Track the agenda while we talk.";
  const text = "Agenda updated: pricing is done, hiring moved up.";
  const items = [
    runStarted(),
    stateSnapshot({ agenda: [{ id: "a1", title: "Pricing", done: false }, { id: "a2", title: "Roadmap", done: false }], phase: "discussion", counters: { decisions: 0 } }),
    stateDelta([{ op: "replace", path: "/agenda/0/done", value: true }]),
    stateDelta([{ op: "add", path: "/agenda/-", value: { id: "a3", title: "Hiring", done: false } }]),
    stateDelta([{ op: "test", path: "/phase", value: "discussion" }, { op: "replace", path: "/phase", value: "wrap-up" }]),
    stateDelta([{ op: "move", from: "/agenda/2", path: "/agenda/1" }]),
    stateDelta([{ op: "copy", from: "/phase", path: "/lastPhase" }, { op: "replace", path: "/counters/decisions", value: 2 }]),
    stateDelta([{ op: "remove", path: "/lastPhase" }]),
    ...textMessage("msg-state-1", text),
    runFinished({ type: "success" }),
  ];
  return defineScenario({
    id: "state-snapshot-delta",
    title: "Shared state: snapshot then RFC 6902 deltas (all six ops)",
    description: "STATE_SNAPSHOT followed by STATE_DELTA patches using add, remove, replace, move, copy and test. Final state must deep-equal `expected.state`.",
    tags: ["@state"],
    userPrompt: prompt,
    runs: [{ trigger: { kind: "initial" }, items }],
    expected: {
      runStatus: "finished",
      noProtocolErrors: true,
      messages: [userTurn(prompt), { id: "msg-state-1", role: "assistant", textEquals: text, status: "complete" }],
      state: {
        agenda: [
          { id: "a1", title: "Pricing", done: true },
          { id: "a3", title: "Hiring", done: false },
          { id: "a2", title: "Roadmap", done: false },
        ],
        phase: "wrap-up",
        counters: { decisions: 2 },
      },
    },
  });
}

export function reasoningSubagentsScenario(): ScenarioFile {
  const prompt = "Ask the Scribe and the Researcher what changed since last week.";
  const thinking = "The user wants a diff. I will ask the Scribe for notes and the Researcher for sources.";
  const answer = "The Scribe reports two new decisions. The Researcher could not reach the archive.";
  const items = [
    runStarted(),
    ...reasoning("rsn-1", thinking),
    reasoningChunk("rsn-2", "Checking both subagents finished."),
    reasoningEncrypted("rsn-2", "ZW5jcnlwdGVkLXJlYXNvbmluZy1ibG9i"),
    subagentStarted("sub-scribe-1", "scribe"),
    subagentFinished("sub-scribe-1", { decisions: 2 }),
    subagentStarted("sub-research-1", "researcher"),
    subagentError("sub-research-1", "Archive unreachable.", "ARCHIVE_DOWN"),
    ...textMessage("msg-rsn-1", answer),
    messagesSnapshot([
      { id: "msg-user-hist", role: "user", content: "Earlier question from last week." },
      { id: "msg-asst-hist", role: "assistant", content: "Earlier answer from last week." },
      { id: "msg-rsn-1", role: "assistant", content: answer },
    ]),
    runFinished({ type: "success" }),
  ];
  return defineScenario({
    id: "reasoning-subagents-snapshot",
    title: "Reasoning, encrypted reasoning, subagents and MESSAGES_SNAPSHOT",
    description:
      "REASONING_* (including CHUNK and ENCRYPTED_VALUE, which must not be shown as text), SUBAGENT_STARTED/FINISHED/ERROR, and a " +
      "trailing MESSAGES_SNAPSHOT. AG-UI semantics: MESSAGES_SNAPSHOT replaces the message list, so the final transcript " +
      "is exactly the three snapshot messages (history + the answer); the live user turn and reasoning are replaced.",
    tags: ["@reasoning", "@subagents", "@snapshot"],
    userPrompt: prompt,
    runs: [{ trigger: { kind: "initial" }, items }],
    expected: {
      runStatus: "finished",
      noProtocolErrors: true,
      messages: [
        { id: "msg-user-hist", role: "user", textEquals: "Earlier question from last week." },
        { id: "msg-asst-hist", role: "assistant", textEquals: "Earlier answer from last week." },
        { id: "msg-rsn-1", role: "assistant", textEquals: answer },
      ],
      subagents: [
        { subagentRunId: "sub-scribe-1", status: "finished" },
        { subagentRunId: "sub-research-1", status: "error" },
      ],
    },
  });
}
