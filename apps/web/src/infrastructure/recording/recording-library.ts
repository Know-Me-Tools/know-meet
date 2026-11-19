// TJ-ARCH-MOB-001 compliant
import {
  err,
  ok,
  parseRecordingRequestId,
  type RecordingRequestId,
  type Result,
  type Support,
} from "@know-meet/domain";
import type {
  LocalRecording,
  PlaybackSource,
  RecordingLibrary,
  RecordingLibraryError,
  RecordingState,
  RecordingStorageInfo,
} from "./library-types";
import { extensionFor, hasRecordingStorage } from "./recording-support";
import type { RecordingChangeBus } from "./store/recording-change-bus";
import {
  estimateStorage,
  heldRecordingIds,
  listRecordingFiles,
  openRecordingFile,
  type RecordingFileInfo,
  removeRecordingFile,
} from "./store/recording-files";
import type {
  IndexedRecording,
  RecordingIndex,
  RecordingMeetingLink,
} from "./store/recording-index";

export interface RecordingLibraryOptions {
  readonly index: RecordingIndex;
  readonly changes: RecordingChangeBus;
  /** The id this tab is recording right now, or null. */
  readonly localActiveId: () => RecordingRequestId | null;
  readonly isPersisted: () => Promise<boolean>;
  readonly requestPersistence: () => Promise<boolean>;
}

const unavailable = (): RecordingLibraryError => ({ code: "recordings-unavailable" });
const failed = (): RecordingLibraryError => ({ code: "recordings-failed" });

/** The state of a row, from what the index says, what the file system has and who holds the lock. */
function stateOf(
  row: IndexedRecording | null,
  file: RecordingFileInfo | undefined,
  writing: boolean,
): RecordingState {
  if (writing) return "recording";
  if (file === undefined) return "missing";
  if (row === null || row.endReason === null || row.endReason === "failed") return "incomplete";
  return row.endReason === "storage-full" ? "stopped-early" : "complete";
}

function describeRow(
  row: IndexedRecording,
  file: RecordingFileInfo | undefined,
  link: RecordingMeetingLink | undefined,
  writing: boolean,
  here: boolean,
): LocalRecording {
  return {
    id: row.id,
    roomCode: row.roomCode ?? link?.roomCode ?? null,
    meetingId: link?.meetingId ?? null,
    meetingTitle: link?.title ?? null,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    mimeType: row.mimeType,
    sizeBytes: file?.size ?? row.sizeBytes,
    state: stateOf(row, file, writing),
    recordingHere: here,
  };
}

/** A file with no index row (the index was unavailable, or the row was lost). */
function describeOrphan(
  id: RecordingRequestId,
  file: RecordingFileInfo,
  link: RecordingMeetingLink | undefined,
  writing: boolean,
  here: boolean,
): LocalRecording {
  return {
    id,
    roomCode: link?.roomCode ?? null,
    meetingId: link?.meetingId ?? null,
    meetingTitle: link?.title ?? null,
    startedAt: file.lastModified ?? 0,
    endedAt: null,
    mimeType: file.name.endsWith(".mp4") ? "video/mp4" : "video/webm",
    sizeBytes: file.size ?? 0,
    state: stateOf(null, file, writing),
    recordingHere: here,
  };
}

/** The id a file name carries, or null for a file that is not a recording of ours. */
function idOfFile(name: string): RecordingRequestId | null {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? null : parseRecordingRequestId(name.slice(0, dot));
}

/**
 * The recordings library (wc10, WC-10): the index rows joined with what OPFS actually
 * holds and which writers are alive. The file system is the truth for size and presence;
 * the index adds the meeting, times and how it ended; a Web Lock tells a recording that
 * is still being written from one whose tab died.
 */
export function createRecordingLibrary(options: RecordingLibraryOptions): RecordingLibrary {
  const support: Support = hasRecordingStorage() ? "supported" : "unsupported";

  const readAll = async (
    signal?: AbortSignal,
  ): Promise<Result<readonly LocalRecording[], RecordingLibraryError>> => {
    signal?.throwIfAborted();
    const files = await listRecordingFiles();
    if (files === null) return err(unavailable());
    const [rows, links, held] = await Promise.all([
      options.index.rows(),
      options.index.links(),
      heldRecordingIds(),
    ]);
    signal?.throwIfAborted();
    const active = options.localActiveId();
    // Without the Web Locks API only this tab's own recording is known to be running.
    const isWriting = (id: string): boolean => (held === null ? active === id : held.has(id));
    const entries: LocalRecording[] = [];
    const seen = new Set<string>();
    for (const row of rows ?? []) {
      seen.add(row.fileName);
      const link = links.get(row.id);
      entries.push(
        describeRow(row, files.get(row.fileName), link, isWriting(row.id), active === row.id),
      );
    }
    for (const [name, file] of files) {
      if (seen.has(name)) continue;
      const id = idOfFile(name);
      if (id === null) continue;
      entries.push(describeOrphan(id, file, links.get(id), isWriting(id), active === id));
    }
    entries.sort((a, b) => b.startedAt - a.startedAt || (a.id < b.id ? 1 : -1));
    return ok(entries);
  };

  const findOne = async (
    id: RecordingRequestId,
  ): Promise<Result<LocalRecording | null, RecordingLibraryError>> => {
    try {
      const all = await readAll();
      return all.ok ? ok(all.value.find((entry) => entry.id === id) ?? null) : all;
    } catch {
      return err(failed());
    }
  };

  const storage = async (): Promise<RecordingStorageInfo> => ({
    support,
    ...(await estimateStorage()),
    persisted: await options.isPersisted(),
  });

  return {
    support,
    list: async (signal) => {
      try {
        return await readAll(signal);
      } catch {
        if (signal?.aborted === true) throw signal.reason;
        return err(failed());
      }
    },
    get: findOne,
    openPlayback: async (id) => {
      const found = await findOne(id);
      if (!found.ok) return found;
      const entry = found.value;
      if (entry === null || entry.state === "missing")
        return err({ code: "recording-file-missing" });
      if (entry.state === "recording") return err({ code: "recording-in-progress" });
      const file = await openRecordingFile(`${id}.${extensionFor(entry.mimeType)}`);
      if (file === null) return err({ code: "recording-file-missing" });
      // A typed view of the same bytes: the blob is a lazy slice, nothing is copied.
      const url = URL.createObjectURL(file.slice(0, file.size, entry.mimeType));
      const source: PlaybackSource = {
        url,
        mimeType: entry.mimeType,
        revoke: () => URL.revokeObjectURL(url),
      };
      return ok(source);
    },
    remove: async (id) => {
      const found = await findOne(id);
      if (!found.ok) return found;
      const entry = found.value;
      if (entry?.state === "recording") return err({ code: "recording-in-progress" });
      const outcome = await removeRecordingFile(
        `${id}.${extensionFor(entry?.mimeType ?? "video/webm")}`,
      );
      if (outcome === "busy") return err({ code: "recording-in-progress" });
      if (outcome === "failed") return err(failed());
      if (!(await options.index.remove(id))) return err(failed());
      options.changes.publish({ kind: "deleted", id });
      return ok(undefined);
    },
    storage,
    requestPersistence: async () => {
      await options.requestPersistence();
      return storage();
    },
    subscribe: (listener) => options.changes.subscribe(listener),
  };
}
