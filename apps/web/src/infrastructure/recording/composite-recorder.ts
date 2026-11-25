// TJ-ARCH-MOB-001 compliant
import type { LocalRecorder, RealtimeRoom } from "@know-meet/application";
import {
  conferencingErrors,
  err,
  ok,
  type RecorderFailureReason,
  type RecordingRequestId,
} from "@know-meet/domain";
import type { RecordingIndexWriter } from "./library-types";
import { type CaptureMicrophone, captureMicrophoneFromBrowser } from "./local-microphone";
import { RecordingSession } from "./recording-session";
import { detectRecordingSupport, pickRecordingFormat } from "./recording-support";
import { estimateStorage } from "./store/recording-files";
import { createOpfsWriter, type RecordingWriter } from "./writer/opfs-writer-client";

export interface CompositeRecorder extends LocalRecorder {
  activeRequestId(): RecordingRequestId | null;
  isSaving(id: RecordingRequestId): boolean;
}

export interface CompositeRecorderOptions {
  readonly room: RealtimeRoom;
  readonly index: RecordingIndexWriter;
  readonly roomCode: () => string | null;
  readonly now?: () => number;
  readonly freeBytes?: () => Promise<number | null>;
  readonly createWriter?: () => RecordingWriter;
  readonly captureMicrophone?: CaptureMicrophone;
}

async function defaultFreeBytes(): Promise<number | null> {
  const { usedBytes, quotaBytes } = await estimateStorage();
  return usedBytes === null || quotaBytes === null ? null : quotaBytes - usedBytes;
}

/** A tab has one live capture. Each finished capture drains only its own encoder and file. */
export function createCompositeRecorder(options: CompositeRecorderOptions): CompositeRecorder {
  const support = detectRecordingSupport();
  const listeners = new Set<
    (reason: RecorderFailureReason, requestId: RecordingRequestId) => void
  >();
  const saving = new Map<RecordingRequestId, RecordingSession>();
  let active: RecordingSession | null = null;
  let lastCutoff: RecordingSession | null = null;

  return {
    support,
    activeRequestId: () => active?.id ?? null,
    isSaving: (id) => saving.has(id),
    prepare: async (id, capture) => {
      const format = support === "supported" ? pickRecordingFormat() : null;
      if (format === null) return err(conferencingErrors.recorderFailed("unsupported"));
      if (active !== null || saving.has(id) || capture?.signal.aborted) {
        return err(conferencingErrors.recorderFailed("failed"));
      }
      const session = new RecordingSession({
        id,
        capture,
        room: options.room,
        roomCode: options.roomCode(),
        index: options.index,
        now: options.now ?? Date.now,
        createWriter: options.createWriter ?? createOpfsWriter,
        captureMicrophone: options.captureMicrophone ?? captureMicrophoneFromBrowser,
        freeBytes: options.freeBytes ?? defaultFreeBytes,
        format,
        onCutoff: () => {
          if (active === session) active = null;
          lastCutoff = session;
          saving.set(id, session);
        },
        onSaved: () => {
          saving.delete(id);
          if (lastCutoff === session) lastCutoff = null;
        },
        onFailure: (reason) => {
          for (const listener of [...listeners]) {
            try {
              listener(reason, id);
            } catch {
              // One listener cannot interrupt capture cutoff or another listener's notice.
            }
          }
        },
      });
      active = session;
      return session.prepare();
    },
    start: (id) =>
      active?.id === id ? active.start() : err(conferencingErrors.recorderFailed("failed")),
    stop: (id) => {
      const session = id === undefined || active?.id === id ? active : saving.get(id);
      const target = id === undefined ? (session ?? lastCutoff) : session;
      return target?.stop() ?? Promise.resolve(ok(undefined));
    },
    onStoppedItself: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
