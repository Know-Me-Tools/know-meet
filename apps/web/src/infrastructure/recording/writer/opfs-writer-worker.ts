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

/** Flushes and closes the file, keeping what was written. Never throws. */
function closeFile(): number {
  const open = handle;
  handle = null;
  if (open !== null) {
    try {
      open.flush();
    } catch {
      // The bytes already written stay; a failed flush cannot make them worse.
    }
    try {
      open.close();
    } catch {
      // Closing a handle that already failed has nothing left to release.
    }
  }
  release();
  return offset;
}

function failureOf(error: unknown): WriterFailure {
  return isDomError(error, "QuotaExceededError") ? "quota-exceeded" : "failed";
}

function fail(reason: WriterFailure): void {
  finished = true;
  post({ type: "failed", reason, size: closeFile() });
}

async function open(request: Extract<WriterRequest, { type: "open" }>): Promise<void> {
  try {
    await holdLock(request.lockName);
  } catch {
    fail("storage-unavailable");
    return;
  }
  let directory: DirectoryHandleLike;
  try {
    directory = await recordingsDirectory(RECORDINGS_DIRECTORY, true);
    const file = await directory.getFileHandle(request.fileName, { create: true });
    handle = await file.createSyncAccessHandle();
    offset = handle.getSize();
  } catch {
    fail("storage-unavailable");
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
        fail("quota-exceeded");
        return;
      }
      written += count;
      offset += count;
    }
    open.flush();
  } catch (error) {
    // A partly written chunk still counts: `offset` follows the bytes that landed.
    fail(failureOf(error));
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
          finished = true;
          post({ type: "closed", size: closeFile() });
          return;
      }
    })
    .catch(() => {
      if (!finished) fail("failed");
    });
});
