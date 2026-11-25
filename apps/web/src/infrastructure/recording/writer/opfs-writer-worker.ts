// TJ-ARCH-MOB-001 compliant

import { RECORDINGS_DIRECTORY } from "../recording-constants";
import {
  type DirectoryHandleLike,
  isDomError,
  recordingsDirectory,
  type SyncAccessHandleLike,
} from "../store/opfs-types";
import type { WriterEvent, WriterFailure, WriterRequest } from "./writer-protocol";

/**
 * The recording writer (wc10 task 10.2). A dedicated worker owns one OPFS file through a
 * synchronous access handle, which only workers may open and which writes without blocking
 * the page. Chunks are appended in the order they arrive and flushed each time, so a tab
 * that dies mid-recording leaves a file that holds everything up to the last chunk.
 *
 * It also holds a Web Lock named after the recording for as long as it writes. Another
 * tab reads that lock to tell "still recording" from "never finished". The lock is
 * released when the worker closes the file, fails, or dies with the tab.
 */
interface WorkerScope {
  postMessage(message: WriterEvent): void;
  addEventListener(type: "message", listener: (event: MessageEvent<WriterRequest>) => void): void;
}

const scope = self as unknown as WorkerScope;

let handle: SyncAccessHandleLike | null = null;
let offset = 0;
let releaseLock: (() => void) | null = null;
let finished = false;
let firstFailure: WriterFailure | null = null;

function post(event: WriterEvent): void {
  scope.postMessage(event);
}

/** Resolves once the lock is held; it stays held until `releaseLock` runs. */
function holdLock(name: string): Promise<void> {
  if (typeof navigator.locks === "undefined") return Promise.resolve();
  return new Promise<void>((acquired, rejected) => {
    navigator.locks
      .request(name, { mode: "exclusive" }, () => {
        return new Promise<void>((release) => {
          releaseLock = release;
          acquired();
        });
      })
      .catch(rejected);
  });
}

function release(): void {
  const done = releaseLock;
  releaseLock = null;
  done?.();
}

function failureOf(error: unknown): WriterFailure {
  return isDomError(error, "QuotaExceededError") ? "quota-exceeded" : "failed";
}

function reportFailure(reason: WriterFailure): void {
  if (firstFailure !== null) return;
  firstFailure = reason;
  post({ type: "failing", reason, size: offset });
}

/** Preserve the written prefix and report a failing flush before waiting for close. */
function finish(reason?: WriterFailure): void {
  finished = true;
  if (reason !== undefined) reportFailure(reason);
  const open = handle;
  handle = null;
  if (open !== null) {
    try {
      open.flush();
    } catch (error) {
      reportFailure(failureOf(error));
    }
    try {
      open.close();
    } catch (error) {
      reportFailure(failureOf(error));
    }
  }
  release();
  post(
    firstFailure === null
      ? { type: "closed", size: offset }
      : { type: "failed", reason: firstFailure, size: offset },
  );
}

async function open(request: Extract<WriterRequest, { type: "open" }>): Promise<void> {
  try {
    await holdLock(request.lockName);
  } catch {
    finish("storage-unavailable");
    return;
  }
  let directory: DirectoryHandleLike;
  try {
    directory = await recordingsDirectory(RECORDINGS_DIRECTORY, true);
    const file = await directory.getFileHandle(request.fileName, { create: true });
    handle = await file.createSyncAccessHandle();
    offset = handle.getSize();
  } catch {
    finish("storage-unavailable");
    return;
  }
  post({ type: "opened" });
}

function append(chunk: ArrayBuffer): void {
  const open = handle;
  if (open === null) return;
  const bytes = new Uint8Array(chunk);
  let written = 0;
  try {
    while (written < bytes.byteLength) {
      const count = open.write(bytes.subarray(written), { at: offset });
      // A write that accepts nothing is how a full disk shows when no error is thrown.
      if (count <= 0) {
        finish("quota-exceeded");
        return;
      }
      written += count;
      offset += count;
    }
    open.flush();
  } catch (error) {
    // A partly written chunk still counts: `offset` follows the bytes that landed.
    finish(failureOf(error));
  }
}

let queue: Promise<void> = Promise.resolve();

scope.addEventListener("message", (event) => {
  const request = event.data;
  queue = queue
    .then(async () => {
      if (finished) return;
      switch (request.type) {
        case "open":
          await open(request);
          return;
        case "append":
          append(request.chunk);
          return;
        case "close":
          finish();
          return;
      }
    })
    .catch(() => {
      if (!finished) finish("failed");
    });
});
