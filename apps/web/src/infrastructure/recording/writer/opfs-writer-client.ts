// TJ-ARCH-MOB-001 compliant
import { conferencingErrors, err, ok, type RecorderFailed, type Result } from "@know-meet/domain";
import type { WriterEvent, WriterFailure, WriterRequest } from "./writer-protocol";

/**
 * Appends a recording to one OPFS file through the writer worker. Nothing here reaches a
 * network: the file lives in the origin's private file system.
 */
export interface RecordingWriter {
  /** Opens (creating) the file and takes the recording lock. Call once. */
  open(fileName: string, lockName: string): Promise<Result<void, RecorderFailed>>;
  /** Queues a chunk, in order. Hands the buffer to the worker; do not use it afterwards. */
  append(chunk: ArrayBuffer): void;
  /** Flushes and closes. Resolves with the bytes written; never rejects, never hangs. */
  close(): Promise<number>;
  /** Called once if the worker stops writing by itself; the file is already closed. */
  onFailed(listener: (reason: WriterFailure, size: number) => void): () => void;
}

const CLOSE_TIMEOUT_MS = 10_000;

function recorderFailure(reason: WriterFailure): RecorderFailed {
  return conferencingErrors.recorderFailed(
    reason === "quota-exceeded"
      ? "quota-exceeded"
      : reason === "storage-unavailable"
        ? "storage-unavailable"
        : "failed",
  );
}

export function createOpfsWriter(): RecordingWriter {
  let worker: Worker | null = null;
  let settleOpen: ((result: Result<void, RecorderFailed>) => void) | null = null;
  let settleClose: ((size: number) => void) | null = null;
  let finalSize = 0;
  let ended = false;
  const failedListeners = new Set<(reason: WriterFailure, size: number) => void>();

  const send = (request: WriterRequest, transfer: Transferable[] = []): void => {
    worker?.postMessage(request, transfer);
  };

  const stopWorker = (): void => {
    worker?.terminate();
    worker = null;
  };

  const onEvent = (event: WriterEvent): void => {
    switch (event.type) {
      case "opened":
        settleOpen?.(ok(undefined));
        settleOpen = null;
        return;
      case "closed":
        ended = true;
        finalSize = event.size;
        settleClose?.(event.size);
        settleClose = null;
        stopWorker();
        return;
      case "failed":
        ended = true;
        finalSize = event.size;
        if (settleOpen !== null) {
          settleOpen(err(recorderFailure(event.reason)));
          settleOpen = null;
        } else {
          for (const listener of [...failedListeners]) listener(event.reason, event.size);
        }
        settleClose?.(event.size);
        settleClose = null;
        stopWorker();
        return;
    }
  };

  const onWorkerCrash = (): void => onEvent({ type: "failed", reason: "failed", size: finalSize });

  return {
    open: (fileName, lockName) => {
      if (typeof Worker === "undefined") {
        return Promise.resolve(err(conferencingErrors.recorderFailed("storage-unavailable")));
      }
      return new Promise((resolve) => {
        try {
          worker = new Worker(new URL("./opfs-writer-worker.ts", import.meta.url), {
            type: "module",
            name: "know-meet-recording-writer",
          });
        } catch {
          resolve(err(conferencingErrors.recorderFailed("storage-unavailable")));
          return;
        }
        settleOpen = resolve;
        worker.addEventListener("message", (event: MessageEvent<WriterEvent>) =>
          onEvent(event.data),
        );
        worker.addEventListener("error", onWorkerCrash);
        worker.addEventListener("messageerror", onWorkerCrash);
        send({ type: "open", fileName, lockName });
      });
    },
    append: (chunk) => {
      if (ended) return;
      send({ type: "append", chunk }, [chunk]);
    },
    close: () => {
      if (ended || worker === null) return Promise.resolve(finalSize);
      return new Promise<number>((resolve) => {
        const timer = setTimeout(() => {
          settleClose = null;
          ended = true;
          stopWorker();
          resolve(finalSize);
        }, CLOSE_TIMEOUT_MS);
        settleClose = (size) => {
          clearTimeout(timer);
          resolve(size);
        };
        send({ type: "close" });
      });
    },
    onFailed: (listener) => {
      failedListeners.add(listener);
      return () => {
        failedListeners.delete(listener);
      };
    },
  };
}
