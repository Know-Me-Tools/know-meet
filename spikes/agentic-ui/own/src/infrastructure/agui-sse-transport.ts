/**
 * Own AG-UI HTTP transport: POST RunAgentInput, read the SSE body with our
 * parser (malformed frames become protocol errors, not run failures), and on
 * a network error or premature end before RUN_FINISHED/RUN_ERROR reconnect to
 * the same URL with `Last-Event-ID` and the same body, up to MAX_RETRIES.
 */
import type { AgUiTransport, RunAgentInputBody, StreamSink, TransportOutcome } from "../application/ports.ts";
import { decodeFrame } from "./agui-event-decoder.ts";
import { SseParser } from "./sse-parser.ts";

const MAX_RETRIES = 3;
const BACKOFF_MS = 150;

class PrematureEnd extends Error {}

interface StreamCursor {
  lastEventId: string | null;
  terminal: boolean;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

export class SseAgUiTransport implements AgUiTransport {
  constructor(private readonly url: string) {}

  async run(body: RunAgentInputBody, sink: StreamSink, signal: AbortSignal): Promise<TransportOutcome> {
    const cursor: StreamCursor = { lastEventId: null, terminal: false };
    const payload = JSON.stringify(body);
    for (let attempt = 0; ; attempt += 1) {
      try {
        const outcome = await this.attempt(payload, cursor, sink, signal);
        if (outcome !== null) return outcome;
        if (cursor.terminal) return { kind: "completed" };
        throw new PrematureEnd("stream ended before the run finished");
      } catch (error) {
        if (signal.aborted) return { kind: "aborted" };
        if (cursor.terminal) return { kind: "completed" };
        if (attempt >= MAX_RETRIES) return { kind: "failed", message: error instanceof Error ? error.message : String(error) };
        await wait(BACKOFF_MS * (attempt + 1), signal);
        if (signal.aborted) return { kind: "aborted" };
      }
    }
  }

  /** One HTTP attempt. Returns an outcome for non-retryable responses, null after reading a body. */
  private async attempt(payload: string, cursor: StreamCursor, sink: StreamSink, signal: AbortSignal): Promise<TransportOutcome | null> {
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "text/event-stream" };
    if (cursor.lastEventId !== null) headers["Last-Event-ID"] = cursor.lastEventId;
    const response = await fetch(this.url, { method: "POST", headers, body: payload, signal, cache: "no-store" });
    if (response.status === 204) return { kind: "completed" };
    if (!response.ok || response.body === null) {
      const detail = await response.text().catch(() => "");
      return { kind: "failed", message: `HTTP ${response.status}${detail === "" ? "" : `: ${detail.slice(0, 200)}`}` };
    }
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    const parser = new SseParser();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return null;
        for (const frame of parser.push(value)) this.deliver(frame.id, frame.data, cursor, sink);
      }
    } finally {
      reader.releaseLock();
    }
  }

  private deliver(id: string | null, data: string, cursor: StreamCursor, sink: StreamSink): void {
    if (id !== null) cursor.lastEventId = id;
    if (cursor.terminal) {
      sink.onProtocolError("event-after-terminal");
      return;
    }
    const decoded = decodeFrame(data);
    if (!decoded.ok) {
      sink.onProtocolError(decoded.code, decoded.eventType);
      return;
    }
    if (decoded.event.type === "RUN_FINISHED" || decoded.event.type === "RUN_ERROR") cursor.terminal = true;
    sink.onEvent(decoded.event);
  }
}
