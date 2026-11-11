/**
 * Per-run ordering guard for schema-valid AG-UI events.
 *
 * `@ag-ui/client`'s verify step errors the whole run on an ordering violation
 * (CONTENT before START, ARGS for an unknown tool call, an event after
 * RUN_FINISHED). The contract wants such events recorded and skipped instead,
 * so the transport runs every event through this guard before the
 * assistant-ui runtime sees it. Pure state machine, no I/O.
 */

export interface WireEvent {
  readonly type: string;
  readonly [field: string]: unknown;
}

export type GuardVerdict = { readonly ok: true } | { readonly ok: false; readonly code: string };

const OK: GuardVerdict = { ok: true };
const reject = (code: string): GuardVerdict => ({ ok: false, code });

function id(event: WireEvent, key: string): string {
  const v = event[key];
  return typeof v === "string" ? v : "";
}

export class EventGuard {
  private terminal = false;
  private readonly openMessages = new Set<string>();
  private readonly seenMessages = new Set<string>();
  private readonly openTools = new Set<string>();
  private readonly seenTools = new Set<string>();
  private readonly openReasoning = new Set<string>();

  check(event: WireEvent): GuardVerdict {
    if (this.terminal) return reject("event-after-run-end");
    switch (event.type) {
      case "RUN_FINISHED":
      case "RUN_ERROR":
        this.terminal = true;
        return OK;
      case "TEXT_MESSAGE_START":
        return this.start(this.openMessages, this.seenMessages, id(event, "messageId"), "duplicate-message-start");
      case "TEXT_MESSAGE_CONTENT":
        return this.openMessages.has(id(event, "messageId")) ? OK : reject("unknown-message");
      case "TEXT_MESSAGE_END":
        return this.end(this.openMessages, id(event, "messageId"), "unknown-message");
      case "TEXT_MESSAGE_CHUNK":
        return this.chunk(this.openMessages, this.seenMessages, id(event, "messageId"));
      case "TOOL_CALL_START":
        return this.start(this.openTools, this.seenTools, id(event, "toolCallId"), "duplicate-tool-call-start");
      case "TOOL_CALL_ARGS":
        return this.openTools.has(id(event, "toolCallId")) ? OK : reject("unknown-tool-call");
      case "TOOL_CALL_END":
        return this.end(this.openTools, id(event, "toolCallId"), "unknown-tool-call");
      case "TOOL_CALL_CHUNK":
        return this.chunk(this.openTools, this.seenTools, id(event, "toolCallId"));
      case "REASONING_MESSAGE_START":
        this.openReasoning.add(id(event, "messageId"));
        return OK;
      case "REASONING_MESSAGE_CONTENT":
        return this.openReasoning.has(id(event, "messageId")) ? OK : reject("unknown-reasoning-message");
      case "REASONING_MESSAGE_END":
        return this.end(this.openReasoning, id(event, "messageId"), "unknown-reasoning-message");
      default:
        return OK;
    }
  }

  private start(open: Set<string>, seen: Set<string>, key: string, code: string): GuardVerdict {
    if (key === "" || seen.has(key)) return reject(code);
    seen.add(key);
    open.add(key);
    return OK;
  }

  private end(open: Set<string>, key: string, code: string): GuardVerdict {
    if (!open.delete(key)) return reject(code);
    return OK;
  }

  /** CHUNK events open their id implicitly; the pipeline's chunk transform closes it. */
  private chunk(open: Set<string>, seen: Set<string>, key: string): GuardVerdict {
    if (key === "") return OK;
    seen.add(key);
    open.add(key);
    return OK;
  }
}
