/** Run lifecycle: client cancel, agent cancel, run error, disconnect + replay. */
import type { ScenarioFile } from "../../domain/scenario.ts";
import { runError, runFinished, runStarted, textMessage, textMessageOpen } from "../event-builders.ts";
import { buildLongMarkdownText } from "./long-markdown.ts";
import { defineScenario, userTurn } from "../scenario-base.ts";

export function cancelMidStreamScenario(): ScenarioFile {
  const prompt = "Walk me through every decision from the meeting.";
  const full = buildLongMarkdownText();
  return defineScenario({
    id: "cancel-mid-stream",
    title: "User cancels mid-stream",
    description:
      "A slow (40 deltas/s) long answer. After ~300 visible characters the check activates the stop control. " +
      "The prototype must abort the HTTP stream, keep the partial text (a strict prefix of the full answer), " +
      "mark the message cancelled and the run cancelled, and leave the composer usable.",
    tags: ["@cancel", "@streaming"],
    userPrompt: prompt,
    pacing: { tokensPerSecond: 40, eventGapMs: 0 },
    runs: [{ trigger: { kind: "initial" }, items: [runStarted(), ...textMessage("msg-cancel-1", full), runFinished({ type: "success" })] }],
    interactions: [{ do: "cancel-run", afterTextChars: 300 }],
    expected: {
      runStatus: "cancelled",
      noProtocolErrors: true,
      messages: [userTurn(prompt), { id: "msg-cancel-1", role: "assistant", textIsStrictPrefixOf: full, status: "cancelled" }],
      server: { requestCount: 1, clientAborted: true },
    },
  });
}

export function agentCancelledScenario(): ScenarioFile {
  const prompt = "Start drafting the follow-up plan.";
  const partial = "Drafting the follow-up plan: first, the";
  return defineScenario({
    id: "run-cancelled-by-agent",
    title: "Agent ends the run with outcome cancelled",
    description: "The agent closes an open message implicitly by ending the run with RUN_FINISHED outcome {type: \"cancelled\"}.",
    tags: ["@cancel"],
    userPrompt: prompt,
    runs: [{ trigger: { kind: "initial" }, items: [runStarted(), ...textMessageOpen("msg-acancel-1", partial), runFinished({ type: "cancelled" })] }],
    expected: {
      runStatus: "cancelled",
      noProtocolErrors: true,
      messages: [userTurn(prompt), { id: "msg-acancel-1", role: "assistant", textEquals: partial, status: "cancelled" }],
    },
  });
}

export function runErrorScenario(): ScenarioFile {
  const prompt = "Fetch last week's recording.";
  const text = "Looking up last week's recording";
  return defineScenario({
    id: "run-error",
    title: "Run fails with RUN_ERROR mid-message",
    description: "An open message is interrupted by RUN_ERROR (code RECORDING_UNAVAILABLE). The partial text stays visible, marked as errored; an error is announced.",
    tags: ["@error"],
    userPrompt: prompt,
    runs: [{ trigger: { kind: "initial" }, items: [runStarted(), ...textMessageOpen("msg-err-1", text), runError("The recording store is unavailable.", "RECORDING_UNAVAILABLE")] }],
    expected: {
      runStatus: "error",
      runErrorCode: "RECORDING_UNAVAILABLE",
      noProtocolErrors: true,
      messages: [userTurn(prompt), { id: "msg-err-1", role: "assistant", textEquals: text, status: "error" }],
      dom: [{ selector: "[role='alert']", minCount: 1 }],
    },
  });
}

export function disconnectReplayScenario(): ScenarioFile {
  const prompt = "Give me the decisions again, please.";
  const text =
    "Here are the decisions. First, AG-UI and A2UI remain the only wire contracts. Second, the spike measures both prototypes " +
    "inside the Tauri webview before anything enters the product. Third, CopilotKit stays excluded. Fourth, entity-graph is " +
    "the durable store of record. That is the complete list.";
  const items = [runStarted(), ...textMessage("msg-replay-1", text), runFinished({ type: "success" })];
  return defineScenario({
    id: "disconnect-reconnect-replay",
    title: "Connection drops mid-stream; client reconnects with Last-Event-ID",
    description:
      "Every SSE frame carries `id: <n>` (harness extension; AG-UI 1.0 defines no resume transport). On the first attempt the " +
      "server destroys the socket after 25 frames. The client must re-POST the same RunAgentInput with header " +
      "`Last-Event-ID: <last id seen>` (or `?lastEventId=`); the server replays from the next frame. The final text must equal " +
      "the original exactly: no duplicated or lost deltas.",
    tags: ["@reconnect", "@replay"],
    userPrompt: prompt,
    pacing: { tokensPerSecond: 60, eventGapMs: 10 },
    runs: [{ trigger: { kind: "initial" }, items, faults: { dropConnectionAfterItems: 25 } }],
    expected: {
      runStatus: "finished",
      noProtocolErrors: true,
      messages: [userTurn(prompt), { id: "msg-replay-1", role: "assistant", textEquals: text, status: "complete" }],
      server: { requestCount: 2, resumedWithLastEventId: true },
    },
  });
}
