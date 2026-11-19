// TJ-ARCH-MOB-001 compliant
import { RECORDING_LOCK_PREFIX, RECORDINGS_DIRECTORY } from "../recording-constants";
import {
  type DirectoryHandleLike,
  type FileHandleLike,
  isDomError,
  recordingsDirectory,
} from "./opfs-types";

/** What a recording file looks like on disk. `size` is null when the file cannot be read now. */
export interface RecordingFileInfo {
  readonly name: string;
  readonly size: number | null;
  readonly lastModified: number | null;
}

/**
 * Every file in the recordings directory, by name. Null when this browser has no OPFS or
 * refuses it; an empty map when nothing was ever recorded.
 */
export async function listRecordingFiles(): Promise<ReadonlyMap<string, RecordingFileInfo> | null> {
  let directory: DirectoryHandleLike;
  try {
    directory = await recordingsDirectory(RECORDINGS_DIRECTORY, false);
  } catch (error) {
    return isDomError(error, "NotFoundError") ? new Map() : null;
  }
  const files = new Map<string, RecordingFileInfo>();
  try {
    for await (const [name, handle] of directory.entries()) {
      if (handle.kind !== "file") continue;
      files.set(name, await describeFile(name, handle));
    }
  } catch {
    return null;
  }
  return files;
}

async function describeFile(name: string, handle: FileHandleLike): Promise<RecordingFileInfo> {
  try {
    const file = await handle.getFile();
    return { name, size: file.size, lastModified: file.lastModified };
  } catch {
    // A file another tab is writing can refuse to be read for a moment.
    return { name, size: null, lastModified: null };
  }
}

/** The file itself, or null when it is not there or cannot be read now. */
export async function openRecordingFile(name: string): Promise<File | null> {
  try {
    const directory = await recordingsDirectory(RECORDINGS_DIRECTORY, false);
    return await (await directory.getFileHandle(name)).getFile();
  } catch {
    return null;
  }
}

export type RemoveFileOutcome = "removed" | "missing" | "busy" | "failed";

/** Deletes one recording file. `busy` when a writer still holds it open. */
export async function removeRecordingFile(name: string): Promise<RemoveFileOutcome> {
  try {
    const directory = await recordingsDirectory(RECORDINGS_DIRECTORY, false);
    await directory.removeEntry(name);
    return "removed";
  } catch (error) {
    if (isDomError(error, "NotFoundError")) return "missing";
    if (isDomError(error, "NoModificationAllowedError") || isDomError(error, "InvalidStateError")) {
      return "busy";
    }
    return "failed";
  }
}

/**
 * Recording ids whose writer holds the lock right now, in this tab or another. Null where
 * the Web Locks API is missing, so the caller cannot tell.
 */
export async function heldRecordingIds(): Promise<ReadonlySet<string> | null> {
  if (typeof navigator === "undefined" || typeof navigator.locks?.query !== "function") return null;
  try {
    const state = await navigator.locks.query();
    const ids = new Set<string>();
    for (const lock of state.held ?? []) {
      const name = lock.name ?? "";
      if (name.startsWith(RECORDING_LOCK_PREFIX)) ids.add(name.slice(RECORDING_LOCK_PREFIX.length));
    }
    return ids;
  } catch {
    return null;
  }
}

/** The browser's storage estimate; nulls where it will not say. */
export async function estimateStorage(): Promise<{
  readonly usedBytes: number | null;
  readonly quotaBytes: number | null;
}> {
  try {
    const estimate = await navigator.storage.estimate();
    return { usedBytes: estimate.usage ?? null, quotaBytes: estimate.quota ?? null };
  } catch {
    return { usedBytes: null, quotaBytes: null };
  }
}
