/**
 * Writes one scenario run as Server-Sent Events, paced like a model stream.
 *
 * Framing: `id: <n>\ndata: <json>\n\n` where n = 1-based position of the item
 * in the run (so Last-Event-ID n resumes at items[n]). raw-sse items are
 * written verbatim (no id). Deltas (TEXT/REASONING/TOOL_CALL args and chunks)
 * are paced at tokensPerSecond; every other item waits eventGapMs first.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pacing, RunRewrites, WireItem } from "../domain/scenario.ts";
import { substituteJson, substituteText, type Origins } from "../shared/placeholders.ts";
import { encodeFrame } from "../shared/sse.ts";
import { isRecord, sleep } from "./http-util.ts";

const THREAD_PLACEHOLDER = "thread-from-request";
const RUN_PLACEHOLDER = "run-from-request";
const MIN_SLEEP_MS = 4;
const MAX_CATCH_UP_MS = 100;
const DROP_FLUSH_MS = 50;

const DELTA_TYPES = new Set([
  "TEXT_MESSAGE_CONTENT",
  "TEXT_MESSAGE_CHUNK",
  "REASONING_MESSAGE_CONTENT",
  "REASONING_MESSAGE_CHUNK",
  "TOOL_CALL_ARGS",
  "TOOL_CALL_CHUNK",
]);

export interface StreamPlan {
  readonly items: readonly WireItem[];
  readonly startAt: number;
  readonly pacing: Pacing;
  /** Destroy the socket after this many items were written by this response. */
  readonly dropAfterItems: number | null;
  readonly runIds: { readonly threadId: string; readonly runId: string };
  readonly origins: Origins;
  readonly rewrites: RunRewrites | undefined;
  readonly onInterruptExpiry: (interruptId: string, expiresAt: string) => void;
  readonly onProgress: (written: number) => void;
  readonly headers: Readonly<Record<string, string>>;
}

export interface StreamResult {
  readonly written: number;
  readonly outcome: "completed" | "client-aborted" | "fault-dropped";
}

function itemType(item: WireItem): string | null {
  if (item.kind === "raw-sse") return null;
  const type = item.event["type"];
  return typeof type === "string" ? type : null;
}

export function delayFor(item: WireItem, pacing: Pacing): number {
  const type = itemType(item);
  if (type !== null && DELTA_TYPES.has(type)) return pacing.tokensPerSecond > 0 ? 1000 / pacing.tokensPerSecond : 0;
  return pacing.eventGapMs;
}

function echoRunIds(event: Record<string, unknown>, plan: StreamPlan): Record<string, unknown> {
  if (plan.rewrites?.echoRunIds === false) return event;
  const next = { ...event };
  if (next["threadId"] === THREAD_PLACEHOLDER) next["threadId"] = plan.runIds.threadId;
  if (next["runId"] === RUN_PLACEHOLDER) next["runId"] = plan.runIds.runId;
  return next;
}

function rewriteExpiry(event: Record<string, unknown>, plan: StreamPlan): Record<string, unknown> {
  const ms = plan.rewrites?.interruptExpiresInMs;
  const outcome = event["outcome"];
  if (ms === undefined || event["type"] !== "RUN_FINISHED" || !isRecord(outcome) || outcome["type"] !== "interrupt") return event;
  const interrupts = Array.isArray(outcome["interrupts"]) ? outcome["interrupts"] : [];
  const expiresAt = new Date(Date.now() + ms).toISOString();
  const rewritten = interrupts.map((i: unknown) => {
    if (!isRecord(i)) return i;
    if (typeof i["id"] === "string") plan.onInterruptExpiry(i["id"], expiresAt);
    return { ...i, expiresAt };
  });
  return { ...event, outcome: { ...outcome, interrupts: rewritten } };
}

/** Resolves placeholders, run ids and expiry for one item at write time. */
export function prepareItem(item: WireItem, plan: StreamPlan): WireItem {
  if (item.kind === "raw-sse") return { ...item, rawSse: substituteText(item.rawSse, plan.origins) };
  const substituted = substituteJson(item.event, plan.origins) as Record<string, unknown>;
  const event = rewriteExpiry(echoRunIds(substituted, plan), plan);
  return item.kind === "event" ? { kind: "event", event: event as typeof item.event } : { ...item, event };
}

function writeFlushed(res: ServerResponse, frame: string): Promise<void> {
  return new Promise((resolve) => {
    res.write(frame, () => resolve());
  });
}

async function writeWithBackpressure(res: ServerResponse, frame: string, signal: AbortSignal): Promise<void> {
  if (res.write(frame)) return;
  await new Promise<void>((resolve) => {
    const done = (): void => {
      res.off("drain", done);
      signal.removeEventListener("abort", done);
      resolve();
    };
    res.on("drain", done);
    signal.addEventListener("abort", done, { once: true });
  });
}

export async function streamRun(req: IncomingMessage, res: ServerResponse, plan: StreamPlan): Promise<StreamResult> {
  const abort = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) abort.abort();
  });
  req.socket.setNoDelay(true);
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    ...plan.headers,
  });
  res.flushHeaders();

  let written = 0;
  let debt = 0;
  for (let index = plan.startAt; index < plan.items.length; index += 1) {
    if (abort.signal.aborted) return { written, outcome: "client-aborted" };
    const item = plan.items[index];
    if (item === undefined) break;
    debt += delayFor(item, plan.pacing);
    if (debt >= MIN_SLEEP_MS) {
      const before = performance.now();
      await sleep(debt, abort.signal);
      debt = Math.max(-MAX_CATCH_UP_MS, debt - (performance.now() - before));
    }
    if (abort.signal.aborted) return { written, outcome: "client-aborted" };
    const frame = encodeFrame(prepareItem(item, plan), index + 1);
    const isDropPoint = plan.dropAfterItems !== null && written + 1 >= plan.dropAfterItems;
    if (isDropPoint) {
      await writeFlushed(res, frame);
      written += 1;
      plan.onProgress(written);
      await sleep(DROP_FLUSH_MS);
      res.socket?.destroy();
      return { written, outcome: "fault-dropped" };
    }
    await writeWithBackpressure(res, frame, abort.signal);
    written += 1;
    plan.onProgress(written);
  }
  if (abort.signal.aborted) return { written, outcome: "client-aborted" };
  await new Promise<void>((resolve) => res.end(resolve));
  return { written, outcome: "completed" };
}
