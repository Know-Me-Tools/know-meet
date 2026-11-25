// TJ-ARCH-MOB-001 compliant
import { conferencingErrors, err, ok, type RecorderFailed, type Result } from "@know-meet/domain";
import type { WriterEvent, WriterFailure, WriterRequest } from "./writer-protocol";

/** Appends encoded data only to the local recording worker's OPFS file. */
export interface RecordingWriter {
  open(fileName: string, lockName: string): Promise<Result<void, RecorderFailed>>;
  append(chunk: ArrayBuffer): void;
  /** Settles on the worker’s close receipt or crash, independently of capture cutoff. */
  close(): Promise<number>;
  /** First observed failure, including one that occurs after close was requested. */
  onFailed(listener: (reason: WriterFailure, size: number) => void): () => void;
}

export function createOpfsWriter(): RecordingWriter {
  let worker: Worker | null = null;
  let settleOpen: ((result: Result<void, RecorderFailed>) => void) | null = null;
  let settleClose: ((size: number) => void) | null = null;
  let closing: Promise<number> | null = null;
  let finalSize = 0;
  let failure: WriterFailure | null = null;
  let ended = false;
  const listeners = new Set<(reason: WriterFailure, size: number) => void>();

  const reportFailure = (reason: WriterFailure): void => {
    if (failure !== null) return;
    failure = reason;
    settleOpen?.(err(conferencingErrors.recorderFailed(reason)));
    settleOpen = null;
    for (const listener of [...listeners]) listener(reason, finalSize);
  };

  const finish = (size: number): void => {
    ended = true;
    finalSize = size;
    worker?.terminate();
    worker = null;
    settleClose?.(size);
    settleClose = null;
  };

  const onEvent = (event: WriterEvent): void => {
    if (ended) return;
    switch (event.type) {
      case "opened":
        settleOpen?.(ok(undefined));
        settleOpen = null;
        return;
      case "failing":
        finalSize = event.size;
        reportFailure(event.reason);
        return;
      case "failed":
        finalSize = event.size;
        reportFailure(event.reason);
        finish(event.size);
        return;
      case "closed":
        finish(event.size);
        return;
    }
  };

  const onWorkerCrash = (): void => onEvent({ type: "failed", reason: "failed", size: finalSize });
  const send = (message: WriterRequest, transfer: Transferable[] = []): void => {
    try {
      worker?.postMessage(message, transfer);
    } catch {
      onWorkerCrash();
    }
  };

  return {
    open: (fileName, lockName) => {
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
      if (!ended && failure === null) send({ type: "append", chunk }, [chunk]);
    },
    close: () => {
      if (ended || worker === null) return Promise.resolve(finalSize);
      if (closing === null) {
        closing = new Promise<number>((resolve) => {
          settleClose = resolve;
        });
        send({ type: "close" });
      }
      return closing;
    },
    onFailed: (listener) => {
      if (failure !== null) listener(failure, finalSize);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
