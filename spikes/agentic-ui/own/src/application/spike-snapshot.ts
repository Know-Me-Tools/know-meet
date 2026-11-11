/**
 * Projects the transcript onto the harness's normalised SpikeSnapshot
 * (contract.md section 5). The harness types are the contract, imported by
 * relative path as contract.md allows.
 */
import type { SnapshotMessage, SnapshotToolCall, SpikeSnapshot } from "../../../harness/src/domain/spike-probe.ts";
import type { InterruptStatus, TranscriptState } from "../domain/transcript-model.ts";
import type { SurfaceSnapshot } from "./ports.ts";

function interruptStatus(status: InterruptStatus): SpikeSnapshot["interrupts"][number]["status"] {
  return status === "failed" ? "pending" : status;
}

function messages(state: TranscriptState): SnapshotMessage[] {
  return state.messageOrder.flatMap((id) => {
    const m = state.messages[id];
    return m === undefined ? [] : [{ id: m.id, role: m.role, text: m.encrypted ? "" : m.text, status: m.status }];
  });
}

function toolCalls(state: TranscriptState): SnapshotToolCall[] {
  return state.toolOrder.flatMap((id) => {
    const t = state.toolCalls[id];
    if (t === undefined) return [];
    return [
      {
        id: t.id,
        name: t.name,
        args: t.args,
        status: t.status,
        ...(t.hasResult ? { result: t.result } : {}),
        ...(t.parentMessageId === undefined ? {} : { parentMessageId: t.parentMessageId }),
      },
    ];
  });
}

export function toSpikeSnapshot(state: TranscriptState, surfaces: readonly SurfaceSnapshot[]): SpikeSnapshot {
  return {
    threadId: state.threadId,
    runStatus: state.runStatus,
    ...(state.runErrorCode === undefined ? {} : { runErrorCode: state.runErrorCode }),
    messages: messages(state),
    toolCalls: toolCalls(state),
    interrupts: state.interruptOrder.flatMap((id) => {
      const i = state.interrupts[id];
      return i === undefined ? [] : [{ id: i.id, reason: i.reason, status: interruptStatus(i.status), ...(i.toolCallId === undefined ? {} : { toolCallId: i.toolCallId }) }];
    }),
    state: state.state,
    customParts: state.customParts.map((p) => ({ name: p.name, rendering: p.rendering, ...(p.partId === undefined ? {} : { partId: p.partId }) })),
    a2uiSurfaces: surfaces.map((s) => ({ ...s })),
    activities: state.activityOrder.flatMap((id) => {
      const a = state.activities[id];
      return a === undefined ? [] : [{ messageId: a.messageId, activityType: a.activityType }];
    }),
    steps: state.steps.map((s) => ({ ...s })),
    subagents: state.subagents.map((s) => ({ ...s })),
    protocolErrors: state.protocolErrors.map((e) => ({ code: e.code, ...(e.eventType === undefined ? {} : { eventType: e.eventType }) })),
  };
}
