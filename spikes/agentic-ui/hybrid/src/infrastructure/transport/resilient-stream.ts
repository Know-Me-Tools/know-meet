/**
 * One AG-UI run over SSE with what HttpAgent@1.0.4 lacks:
 * - reconnect with `Last-Event-ID` after a network error before RUN_FINISHED / RUN_ERROR (3 retries),
 *   skipping frames at or below the last id so text is neither duplicated nor dropped;
 * - per-frame tolerance: invalid JSON, schema-invalid or unknown events and ordering violations are
 *   reported and skipped instead of failing the run.
 */
import { EventSchemas, EventTypeSchema } from "@ag-ui/core/schemas";
import { EventGuard, type WireEvent } from "../../domain/event-guard.ts";
import { SseFrameParser, type SseFrame } from "./sse-frames.ts";

export const MAX_RECONNECTS = 3;
const RECONNECT_DELAY_MS = 150;

export interface StreamHooks {
  /** An accepted, schema-valid, in-order event. */
  accepted(frameId: string, event: WireEvent): void;
  rejected(frameId: string, code: string, eventType: string | undefined): void;
}

export interface StreamRequest {
  readonly url: string;
  readonly body: string;
  readonly signal: AbortSignal;
}

type Decoded = { readonly ok: true; readonly event: WireEvent } | { readonly ok: false; readonly code: string; readonly type?: string };

function decode(data: string): Decoded {
  let json: unknown;
  try {
    json = JSON.parse(data);
  } catch {
    return { ok: false, code: "invalid-json" };
  }
  const rawType = typeof json === "object" && json !== null ? (json as Record<string, unknown>)["type"] : undefined;
  const type = typeof rawType === "string" ? rawType : undefined;
  if (!EventTypeSchema.safeParse(rawType).success) return { ok: false, code: "unknown-event-type", ...(type === undefined ? {} : { type }) };
  const parsed = EventSchemas.safeParse(json);
  if (!parsed.success) return { ok: false, code: "schema-invalid", ...(type === undefined ? {} : { type }) };
  return { ok: true, event: parsed.data as unknown as WireEvent };
}

class RunState {
  lastId = 0;
  terminal = false;
  frameIndex = 0;
  readonly guard = new EventGuard();
}

function handleFrame(frame: SseFrame, run: RunState, hooks: StreamHooks): void {
  run.frameIndex += 1;
  const numeric = frame.id === null ? Number.NaN : Number(frame.id);
  if (Number.isFinite(numeric)) {
    if (numeric <= run.lastId) return; // already delivered before the reconnect
    run.lastId = numeric;
  }
  const frameId = frame.id ?? `n${run.frameIndex}`;
  const decoded = decode(frame.data);
  if (!decoded.ok) return hooks.rejected(frameId, decoded.code, decoded.type);
  const verdict = run.guard.check(decoded.event);
  if (!verdict.ok) return hooks.rejected(frameId, verdict.code, decoded.event.type);
  if (decoded.event.type === "RUN_FINISHED" || decoded.event.type === "RUN_ERROR") run.terminal = true;
  hooks.accepted(frameId, decoded.event);
}

async function readOnce(req: StreamRequest, run: RunState, hooks: StreamHooks): Promise<void> {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "text/event-stream" };
  if (run.lastId > 0) headers["last-event-id"] = String(run.lastId);
  const response = await fetch(req.url, { method: "POST", headers, body: req.body, signal: req.signal });
  if (response.status === 204) {
    run.terminal = true;
    return;
  }
  if (!response.ok || response.body === null) throw new HttpStatusError(response.status);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  const parser = new SseFrameParser();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    for (const frame of parser.push(value)) handleFrame(frame, run, hooks);
  }
}

export class HttpStatusError extends Error {
  constructor(readonly status: number) {
    super(`The agent endpoint answered HTTP ${status}.`);
    this.name = "HttpStatusError";
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

/** Resolves when the run ends (terminal event, clean close, or abort). Rejects after retries fail. */
export async function streamRun(req: StreamRequest, hooks: StreamHooks): Promise<void> {
  const run = new RunState();
  let attempts = 0;
  for (;;) {
    try {
      await readOnce(req, run, hooks);
      if (run.terminal || req.signal.aborted) return;
      throw new Error("The stream closed before the run finished.");
    } catch (error) {
      if (req.signal.aborted || run.terminal) return;
      if (error instanceof HttpStatusError || attempts >= MAX_RECONNECTS) throw error;
      attempts += 1;
      await delay(RECONNECT_DELAY_MS * attempts, req.signal);
    }
  }
}
