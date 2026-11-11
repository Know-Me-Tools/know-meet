/** Parallel (interleaved) tool calls, steps and TEXT_MESSAGE_CHUNK. */
import type { ScenarioFile, WireItem } from "../../domain/scenario.ts";
import {
  runFinished,
  runStarted,
  stepFinished,
  stepStarted,
  textChunks,
  textMessage,
  textOf,
  toolCallArgs,
  toolCallChunks,
  toolCallEnd,
  toolCallStart,
  toolResult,
} from "../event-builders.ts";
import { defineScenario, userTurn } from "../scenario-base.ts";

const CALLS = [
  { id: "tc-cal-1", name: "calendar_lookup", args: { attendee: "ana@know-me.tools", day: "2026-11-12" } },
  { id: "tc-mem-1", name: "memory_search", args: { query: "pricing decision", limit: 3 } },
  { id: "tc-doc-1", name: "doc_fetch", args: { docId: "spec-42", section: "risks" } },
] as const;

/** Round-robin interleave of the three calls' ARGS deltas. */
function interleavedCalls(parent: string): WireItem[] {
  const args = CALLS.map((c) => toolCallArgs(c.id, c.args));
  const out: WireItem[] = CALLS.map((c) => toolCallStart(c.id, c.name, parent));
  const longest = Math.max(...args.map((a) => a.length));
  for (let i = 0; i < longest; i += 1) {
    for (const list of args) {
      const item = list[i];
      if (item !== undefined) out.push(item);
    }
  }
  out.push(toolCallEnd("tc-mem-1"), toolCallEnd("tc-cal-1"), toolCallEnd("tc-doc-1"));
  return out;
}

export function parallelToolCallsScenario(): ScenarioFile {
  const prompt = "When is Ana free on Thursday, what did we decide on pricing, and what are the spec risks?";
  const intro = "Let me check the calendar, meeting memory and the spec in parallel.";
  const summary =
    "Ana is free 14:00-15:30 on Thursday. Pricing: the team chose usage-based tiers. " +
    "Spec risks: WebView2 is unmeasured and the A2UI Flutter renderer is alpha.";
  const chunkSummaryId = "msg-tools-2";
  const items: WireItem[] = [
    runStarted(),
    stepStarted("gather"),
    ...textMessage("msg-tools-1", intro),
    ...interleavedCalls("msg-tools-1"),
    ...toolCallChunks("tc-wx-1", "weather_lookup", { city: "Lisbon" }, "msg-tools-1"),
    toolResult("res-mem-1", "tc-mem-1", JSON.stringify({ hits: [{ id: "n-7", text: "usage-based tiers" }] })),
    toolResult("res-doc-1", "tc-doc-1", [{ type: "text", text: "Risks: WebView2 unmeasured; a2ui_flutter alpha." }]),
    toolResult("res-cal-1", "tc-cal-1", JSON.stringify({ free: [{ from: "14:00", to: "15:30" }] })),
    toolResult("res-wx-1", "tc-wx-1", JSON.stringify({ tempC: 19 })),
    stepFinished("gather"),
    ...textChunks(chunkSummaryId, summary),
    runFinished({ type: "success" }),
  ];
  return defineScenario({
    id: "parallel-tool-calls",
    title: "Parallel tool calls with interleaved argument deltas",
    description:
      "Three TOOL_CALL_START before any ARGS; ARGS deltas interleave round-robin; ENDs and RESULTs arrive out of start order. " +
      "A fourth call uses TOOL_CALL_CHUNK; the final answer uses TEXT_MESSAGE_CHUNK; STEP_STARTED/FINISHED wrap the work.",
    tags: ["@tools", "@ordering"],
    userPrompt: prompt,
    runs: [{ trigger: { kind: "initial" }, items }],
    expected: {
      runStatus: "finished",
      noProtocolErrors: true,
      messages: [
        userTurn(prompt),
        { id: "msg-tools-1", role: "assistant", textEquals: intro, status: "complete" },
        { id: chunkSummaryId, role: "assistant", textEquals: textOf(items, chunkSummaryId), status: "complete" },
      ],
      toolCalls: [
        ...CALLS.map((c) => ({ id: c.id, name: c.name, args: c.args, status: "complete" as const })),
        { id: "tc-wx-1", name: "weather_lookup", args: { city: "Lisbon" }, status: "complete", resultIncludes: "19" },
      ],
      steps: [{ name: "gather", status: "finished" }],
      dom: [{ selector: "[data-testid='km-tool-call']", count: 4 }],
    },
  });
}
