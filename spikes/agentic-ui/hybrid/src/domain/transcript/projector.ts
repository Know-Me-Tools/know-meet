/**
 * Folds the append-only AG-UI journal (server events plus client decisions) into the normalised
 * transcript model. This is the projection the checkpointer commits to entity-graph.
 *
 * Why it exists in the hybrid: assistant-ui's AG-UI runtime keeps one assistant message per run
 * (parts merged, AG-UI message ids not kept per part), has no steps or protocol-error model and
 * decides HITL state inside its own store. None of that can be the store of record, so the durable
 * model is re-derived from the journal here. The working set is mutable and private; callers only
 * see readonly records.
 */
import { customMessageId, customPartId, customRendering, parseKmCustom } from "../km-custom-parts.ts";
import type { WireEvent } from "../event-guard.ts";
import type {
  ActivityRecord, CustomPartRecord, EntityKind, InterruptRecord, MessageRecord, MessageRole,
  ProtocolErrorRecord, RunRecord, StepRecord, SubagentRecord, ToolCallRecord,
} from "./model.ts";
import { ENTITY } from "./model.ts";
import { ROLES, closeOpen, field, str, textOf } from "./projector-support.ts";

export type JsonPatcher = (document: unknown, operations: readonly unknown[]) => unknown;

export type ClientEvent =
  | { readonly type: "client.user-message"; readonly messageId: string; readonly text: string }
  | { readonly type: "client.cancel" }
  | { readonly type: "client.decision"; readonly interruptId: string; readonly approved: boolean }
  | { readonly type: "client.expired"; readonly interruptId: string }
  | { readonly type: "client.transport-error"; readonly message: string };

export interface DirtyEntity {
  readonly kind: EntityKind;
  readonly id: string;
  readonly record: Readonly<Record<string, unknown>>;
}

/** Events after which the projection is committed to the durable store (idempotent checkpoints). */
const BOUNDARIES: ReadonlySet<string> = new Set([
  "RUN_STARTED", "RUN_FINISHED", "RUN_ERROR", "TEXT_MESSAGE_END", "TOOL_CALL_END", "TOOL_CALL_RESULT", "REASONING_MESSAGE_END",
  "STATE_SNAPSHOT", "STATE_DELTA", "MESSAGES_SNAPSHOT", "ACTIVITY_SNAPSHOT", "ACTIVITY_DELTA", "CUSTOM",
  "STEP_STARTED", "STEP_FINISHED", "SUBAGENT_STARTED", "SUBAGENT_FINISHED", "SUBAGENT_ERROR",
]);

export class TranscriptProjector {
  threadId: string | null = null;
  run: RunRecord = { runId: null, status: "idle" };
  state: unknown = undefined;
  readonly messages = new Map<string, MessageRecord>();
  readonly toolCalls = new Map<string, ToolCallRecord>();
  readonly interrupts = new Map<string, InterruptRecord>();
  readonly customParts: CustomPartRecord[] = [];
  readonly activities = new Map<string, ActivityRecord>();
  readonly steps = new Map<string, StepRecord>();
  readonly subagents = new Map<string, SubagentRecord>();
  readonly protocolErrors: ProtocolErrorRecord[] = [];
  private readonly dirty = new Map<string, DirtyEntity>();

  constructor(
    private readonly patch: JsonPatcher,
    private readonly allowedMediaOrigins: readonly string[],
  ) {}

  /** Applies a server event. Returns true at a checkpoint boundary. */
  applyServer(event: WireEvent): boolean {
    this.reduce(event);
    return BOUNDARIES.has(event.type);
  }

  /** Applies a client-side decision. Client events are always boundaries. */
  applyClient(event: ClientEvent): true {
    switch (event.type) {
      case "client.user-message":
        this.putMessage({ id: event.messageId, role: "user", text: event.text, status: "complete", runId: null });
        break;
      case "client.cancel":
        this.closeMessages("cancelled");
        this.setRun({ ...this.run, status: "cancelled" });
        break;
      case "client.decision":
        this.decide(event.interruptId, event.approved ? "approved" : "rejected");
        break;
      case "client.expired":
        this.decide(event.interruptId, "expired");
        break;
      case "client.transport-error":
        this.closeMessages("error");
        this.setRun({ ...this.run, status: "error", errorMessage: event.message });
        break;
    }
    return true;
  }

  recordProtocolError(error: ProtocolErrorRecord): void {
    this.protocolErrors.push(error);
  }

  /** Entities changed since the last call; the checkpointer writes them in one transaction. */
  takeDirty(): DirtyEntity[] {
    const out = [...this.dirty.values()];
    this.dirty.clear();
    return out;
  }

  hasDirty(): boolean {
    return this.dirty.size > 0;
  }

  private reduce(e: WireEvent): void {
    switch (e.type) {
      case "RUN_STARTED":
        this.threadId = str(e, "threadId") ?? this.threadId;
        this.setRun({ runId: str(e, "runId") ?? null, status: "running" });
        return;
      case "RUN_FINISHED":
        return this.finishRun(field(e, "outcome"));
      case "RUN_ERROR": {
        this.closeMessages("error");
        const code = str(e, "code");
        this.setRun({ ...this.run, status: "error", ...(code === undefined ? {} : { errorCode: code }), errorMessage: str(e, "message") ?? "" });
        return;
      }
      case "TEXT_MESSAGE_START":
      case "REASONING_MESSAGE_START":
        return this.openMessage(str(e, "messageId") ?? "", e.type === "REASONING_MESSAGE_START" ? "reasoning" : roleOf(e));
      case "TEXT_MESSAGE_CONTENT":
      case "REASONING_MESSAGE_CONTENT":
        return this.appendText(str(e, "messageId") ?? "", str(e, "delta") ?? "");
      case "TEXT_MESSAGE_CHUNK":
      case "REASONING_MESSAGE_CHUNK":
        return this.chunk(e, e.type === "REASONING_MESSAGE_CHUNK" ? "reasoning" : roleOf(e));
      case "TEXT_MESSAGE_END":
      case "REASONING_MESSAGE_END":
        return this.endMessage(str(e, "messageId") ?? "");
      case "TOOL_CALL_START":
        return this.startTool(str(e, "toolCallId") ?? "", str(e, "toolCallName") ?? "", str(e, "parentMessageId"));
      case "TOOL_CALL_ARGS":
        return this.toolArgs(str(e, "toolCallId") ?? "", str(e, "delta") ?? "");
      case "TOOL_CALL_CHUNK":
        return this.toolChunk(e);
      case "TOOL_CALL_END":
        return this.endTool(str(e, "toolCallId") ?? "");
      case "TOOL_CALL_RESULT":
        return this.toolResult(str(e, "toolCallId") ?? "", field(e, "content"));
      case "STATE_SNAPSHOT":
        return this.setState(field(e, "snapshot"));
      case "STATE_DELTA": {
        const ops = field(e, "delta");
        return this.setState(this.patch(this.state, Array.isArray(ops) ? ops : []));
      }
      case "MESSAGES_SNAPSHOT":
        return this.replaceMessages(field(e, "messages"));
      case "ACTIVITY_SNAPSHOT":
      case "ACTIVITY_DELTA":
        return this.activity(e);
      case "CUSTOM":
        return this.custom(str(e, "name") ?? "", field(e, "value"));
      case "STEP_STARTED":
      case "STEP_FINISHED": {
        const name = str(e, "stepName") ?? "";
        return this.putEntity(this.steps, ENTITY.step, name, { name, status: e.type === "STEP_STARTED" ? "running" : "finished" });
      }
      case "SUBAGENT_STARTED":
      case "SUBAGENT_FINISHED":
      case "SUBAGENT_ERROR":
        return this.subagent(e);
      default:
        return;
    }
  }

  private finishRun(outcome: unknown): void {
    const type = str(outcome, "type");
    if (type === "cancelled") {
      this.closeMessages("cancelled");
      this.setRun({ ...this.run, status: "cancelled" });
      return;
    }
    this.closeMessages("complete");
    if (type === "interrupt") {
      const list = field(outcome, "interrupts");
      for (const raw of Array.isArray(list) ? list : []) this.addInterrupt(raw);
      this.setRun({ ...this.run, status: "interrupted" });
      return;
    }
    this.setRun({ ...this.run, status: "finished" });
  }

  private addInterrupt(raw: unknown): void {
    const id = str(raw, "id");
    if (id === undefined) return;
    const toolCallId = str(raw, "toolCallId");
    const message = str(raw, "message");
    const expiresAt = str(raw, "expiresAt");
    const record: InterruptRecord = {
      id, reason: str(raw, "reason") ?? "", status: "pending",
      ...(toolCallId === undefined ? {} : { toolCallId }),
      ...(message === undefined ? {} : { message }),
      ...(expiresAt === undefined ? {} : { expiresAt }),
    };
    this.putEntity(this.interrupts, ENTITY.interrupt, id, record);
    if (toolCallId !== undefined) this.updateTool(toolCallId, { status: "pending-approval" });
  }

  private decide(interruptId: string, status: "approved" | "rejected" | "expired"): void {
    const current = this.interrupts.get(interruptId);
    if (current === undefined || current.status !== "pending") return;
    this.putEntity(this.interrupts, ENTITY.interrupt, interruptId, { ...current, status });
    if (current.toolCallId !== undefined) this.updateTool(current.toolCallId, { status });
  }

  private openMessage(id: string, role: MessageRole): void {
    if (id === "") return;
    this.putMessage({ id, role, text: "", status: "streaming", runId: this.run.runId });
  }

  private appendText(id: string, delta: string): void {
    const m = this.messages.get(id);
    if (m === undefined || m.status !== "streaming") return;
    // Live text stays in the working set; it reaches the store at TEXT_MESSAGE_END (a boundary).
    this.messages.set(id, { ...m, text: m.text + delta });
    this.markDirty(ENTITY.message, id, this.messages.get(id));
  }

  private endMessage(id: string): void {
    const m = this.messages.get(id);
    if (m !== undefined && m.status === "streaming") this.putMessage({ ...m, status: "complete" });
  }

  private chunk(e: WireEvent, role: MessageRole): void {
    const id = str(e, "messageId") ?? "";
    if (!this.messages.has(id)) this.openMessage(id, role);
    this.appendText(id, str(e, "delta") ?? "");
  }

  private startTool(id: string, name: string, parentMessageId: string | undefined): void {
    if (id === "") return;
    this.putEntity(this.toolCalls, ENTITY.toolCall, id, {
      id, name, argsText: "", args: "", status: "streaming-args",
      ...(parentMessageId === undefined ? {} : { parentMessageId }),
    });
  }

  private toolArgs(id: string, delta: string): void {
    const t = this.toolCalls.get(id);
    if (t !== undefined) this.updateTool(id, { argsText: t.argsText + delta, args: t.argsText + delta });
  }

  private toolChunk(e: WireEvent): void {
    const id = str(e, "toolCallId") ?? "";
    if (!this.toolCalls.has(id)) this.startTool(id, str(e, "toolCallName") ?? "", str(e, "parentMessageId"));
    this.toolArgs(id, str(e, "delta") ?? "");
    this.endTool(id);
  }

  private endTool(id: string): void {
    const t = this.toolCalls.get(id);
    if (t === undefined) return;
    let args: unknown = t.argsText;
    try {
      args = t.argsText === "" ? {} : JSON.parse(t.argsText);
    } catch {
      args = t.argsText;
    }
    this.updateTool(id, { args, status: t.status === "streaming-args" ? "awaiting-result" : t.status });
  }

  private toolResult(id: string, content: unknown): void {
    const t = this.toolCalls.get(id);
    if (t === undefined) return;
    const keep = t.status === "rejected" || t.status === "expired";
    this.updateTool(id, { result: content, status: keep ? t.status : "complete" });
  }

  private updateTool(id: string, patch: Partial<ToolCallRecord>): void {
    const t = this.toolCalls.get(id);
    if (t !== undefined) this.putEntity(this.toolCalls, ENTITY.toolCall, id, { ...t, ...patch });
  }

  private replaceMessages(raw: unknown): void {
    for (const id of this.messages.keys()) this.markDirty(ENTITY.message, id, undefined);
    this.messages.clear();
    for (const m of Array.isArray(raw) ? raw : []) {
      const id = str(m, "id");
      const role = str(m, "role");
      if (id === undefined || role === undefined || !ROLES.has(role)) continue;
      this.putMessage({ id, role: role as MessageRole, text: textOf(field(m, "content")), status: "complete", runId: this.run.runId });
    }
  }

  private activity(e: WireEvent): void {
    const messageId = str(e, "messageId") ?? "activity";
    const prior = this.activities.get(messageId);
    const activityType = str(e, "activityType") ?? prior?.activityType ?? "";
    const content = e.type === "ACTIVITY_SNAPSHOT"
      ? field(e, "content")
      : this.patch(prior?.content ?? {}, Array.isArray(field(e, "patch")) ? (field(e, "patch") as unknown[]) : []);
    this.putEntity(this.activities, ENTITY.activity, messageId, { messageId, activityType, content });
  }

  private custom(name: string, value: unknown): void {
    const part = parseKmCustom(name, value);
    if (part === null) return;
    const partId = customPartId(part);
    const messageId = customMessageId(part);
    const key = `${name}:${partId ?? this.customParts.length}`;
    const record: CustomPartRecord = {
      key, name, rendering: customRendering(part, this.allowedMediaOrigins),
      ...(partId === undefined ? {} : { partId }),
      ...(messageId === undefined ? {} : { messageId }),
    };
    this.customParts.push(record);
    this.markDirty(ENTITY.customPart, key, record);
  }

  private subagent(e: WireEvent): void {
    const id = str(e, "subagentRunId") ?? "";
    const prior = this.subagents.get(id);
    const status = e.type === "SUBAGENT_STARTED" ? "running" : e.type === "SUBAGENT_FINISHED" ? "finished" : "error";
    this.putEntity(this.subagents, ENTITY.subagent, id, { subagentRunId: id, name: str(e, "name") ?? prior?.name ?? "", status });
  }

  private closeMessages(status: "complete" | "cancelled" | "error"): void {
    for (const m of closeOpen(this.messages, status)) this.markDirty(ENTITY.message, m.id, m);
  }

  private setRun(run: RunRecord): void {
    this.run = run;
    this.markDirty(ENTITY.run, "current", run);
  }

  private setState(state: unknown): void {
    this.state = state;
    this.markDirty(ENTITY.sharedState, "current", { value: state });
  }

  private putMessage(m: MessageRecord): void {
    this.putEntity(this.messages, ENTITY.message, m.id, m);
  }

  private putEntity<T extends object>(map: Map<string, T>, kind: EntityKind, id: string, record: T): void {
    map.set(id, record);
    this.markDirty(kind, id, record);
  }

  private markDirty(kind: EntityKind, id: string, record: object | undefined): void {
    this.dirty.set(`${kind}:${id}`, { kind, id, record: (record ?? { deleted: true }) as Readonly<Record<string, unknown>> });
  }
}

function roleOf(e: WireEvent): MessageRole {
  const role = str(e, "role");
  return role !== undefined && ROLES.has(role) ? (role as MessageRole) : "assistant";
}

