// TJ-ARCH-MOB-001 compliant
import type { LocalRecorder, RealtimeRoom } from "@know-meet/application";
import {
  conferencingErrors,
  err,
  ok,
  type RecorderFailed,
  type RecorderFailureReason,
  type RecordingRequestId,
  type Result,
  type Support,
} from "@know-meet/domain";
import { type CompositePipeline, createCompositePipeline } from "./composite-pipeline";
import type { RecordingIndexWriter } from "./library-types";
import { type CaptureMicrophone, captureMicrophoneFromBrowser } from "./local-microphone";
import { MIN_FREE_BYTES, recordingLockName } from "./recording-constants";
import { detectRecordingSupport, pickRecordingFormat } from "./recording-support";
import { estimateStorage } from "./store/recording-files";
import { createOpfsWriter, type RecordingWriter } from "./writer/opfs-writer-client";
import type { WriterFailure } from "./writer/writer-protocol";

/** A `LocalRecorder` that also says which recording this tab is writing. */
export interface CompositeRecorder extends LocalRecorder {
  activeRequestId(): RecordingRequestId | null;
}

export interface CompositeRecorderOptions {
  readonly room: RealtimeRoom;
  readonly index: RecordingIndexWriter;
  /** The room code of the meeting being recorded, for the index. */
  readonly roomCode: () => string | null;
  readonly now?: () => number;
  /** Free bytes the browser reports, or null when it will not say. */
  readonly freeBytes?: () => Promise<number | null>;
  readonly createWriter?: () => RecordingWriter;
  readonly captureMicrophone?: CaptureMicrophone;
}

type EndReason = "stopped" | "storage-full" | "failed";

interface Active {
  readonly id: RecordingRequestId;
  readonly pipeline: CompositePipeline;
  readonly writer: RecordingWriter;
  readonly stopListening: () => void;
  /** Chunks reach the writer in encoder order even though `arrayBuffer()` is asynchronous. */
  chunks: Promise<void>;
  finalising: Promise<void> | null;
}

async function defaultFreeBytes(): Promise<number | null> {
  const { usedBytes, quotaBytes } = await estimateStorage();
  return usedBytes === null || quotaBytes === null ? null : quotaBytes - usedBytes;
}

function failureFor(reason: WriterFailure): RecorderFailureReason {
  return reason === "quota-exceeded"
    ? "quota-exceeded"
    : reason === "storage-unavailable"
      ? "storage-unavailable"
      : "failed";
}

/**
 * The local recorder (wc10 tasks 10.1 and 10.2): composites the room into one picture and
 * one mix (`composite-pipeline`) and appends the encoded chunks to a file in OPFS through
 * a worker (`writer`), noting it in the recordings index. Only the recording consent use
 * cases start or stop it.
 *
 * - `stop` always finalises and keeps what was written; with nothing recording it succeeds.
 * - A write that fails (storage full, file system lost) or an encoder error ends the
 *   recording by itself: the file is closed with everything written so far, the index row
 *   is closed with how it ended, then the `onStoppedItself` listeners hear why.
 * - If the tab dies instead, no row is ever closed. The writer's lock goes with the tab,
 *   and the library lists the recording as incomplete, with its file intact.
 * - Nothing is sent anywhere.
 */
export function createCompositeRecorder(options: CompositeRecorderOptions): CompositeRecorder {
  const now = options.now ?? Date.now;
  const freeBytes = options.freeBytes ?? defaultFreeBytes;
  const createWriter = options.createWriter ?? createOpfsWriter;
  const captureMicrophone = options.captureMicrophone ?? captureMicrophoneFromBrowser;
  const support: Support = detectRecordingSupport();
  const listeners = new Set<(reason: RecorderFailureReason) => void>();
  let active: Active | null = null;
  let starting = false;

  const finalise = (session: Active, endReason: EndReason): Promise<void> => {
    session.finalising ??= (async () => {
      try {
        session.stopListening();
        await session.pipeline.finish();
        await session.chunks;
        const size = await session.writer.close();
        await session.pipeline.dispose().catch(() => undefined);
        await options.index.finish({ id: session.id, endedAt: now(), sizeBytes: size, endReason });
      } finally {
        if (active === session) active = null;
      }
    })();
    return session.finalising;
  };

  const stopItself = async (
    session: Active,
    endReason: Exclude<EndReason, "stopped">,
    reason: RecorderFailureReason,
  ): Promise<void> => {
    if (session.finalising !== null) return;
    await finalise(session, endReason);
    for (const listener of [...listeners]) {
      try {
        listener(reason);
      } catch {
        // A listener that throws must not keep the others from hearing it.
      }
    }
  };

  const start = async (requestId: RecordingRequestId): Promise<Result<void, RecorderFailed>> => {
    if (support === "unsupported") return err(conferencingErrors.recorderFailed("unsupported"));
    const format = pickRecordingFormat();
    if (format === null) return err(conferencingErrors.recorderFailed("unsupported"));
    if (active !== null || starting) return err(conferencingErrors.recorderFailed("failed"));
    starting = true;
    try {
      const free = await freeBytes();
      if (free !== null && free < MIN_FREE_BYTES) {
        return err(conferencingErrors.recorderFailed("quota-exceeded"));
      }
      const writer = createWriter();
      const fileName = `${requestId}.${format.extension}`;
      const opened = await writer.open(fileName, recordingLockName(requestId));
      if (!opened.ok) return opened;

      let session: Active;
      try {
        const pipeline = createCompositePipeline({
          room: options.room,
          format,
          captureMicrophone,
          onChunk: (chunk) => {
            const current = session;
            current.chunks = current.chunks
              .then(() => chunk.arrayBuffer())
              .then((buffer) => writer.append(buffer))
              .catch(() => undefined);
          },
          onError: () => void stopItself(session, "failed", "failed"),
        });
        const stopListening = writer.onFailed(
          (reason) =>
            void stopItself(
              session,
              reason === "quota-exceeded" ? "storage-full" : "failed",
              failureFor(reason),
            ),
        );
        session = {
          id: requestId,
          pipeline,
          writer,
          stopListening,
          chunks: Promise.resolve(),
          finalising: null,
        };
      } catch {
        await writer.close();
        return err(conferencingErrors.recorderFailed("failed"));
      }

      active = session;
      await options.index.begin({
        id: requestId,
        roomCode: options.roomCode(),
        fileName,
        mimeType: format.mimeType,
        startedAt: now(),
      });
      // The writer can fail while the index row is being made; then it already finalised.
      if (session.finalising !== null) return err(conferencingErrors.recorderFailed("failed"));
      try {
        session.pipeline.start();
      } catch {
        await finalise(session, "failed");
        return err(conferencingErrors.recorderFailed("failed"));
      }
      return ok(undefined);
    } finally {
      starting = false;
    }
  };

  return {
    support,
    activeRequestId: () => active?.id ?? null,
    start,
    stop: async () => {
      const session = active;
      if (session === null) return ok(undefined);
      await finalise(session, "stopped");
      return ok(undefined);
    },
    onStoppedItself: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
