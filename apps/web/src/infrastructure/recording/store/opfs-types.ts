// TJ-ARCH-MOB-001 compliant

/**
 * The slices of the Origin Private File System the recording code uses, typed here so the
 * code does not depend on which of them the installed DOM library declares (the
 * synchronous access handle exists only in workers, and async iteration is a separate
 * library file).
 */
export interface FileHandleLike {
  readonly kind: "file";
  getFile(): Promise<File>;
  createSyncAccessHandle(): Promise<SyncAccessHandleLike>;
}

export interface SyncAccessHandleLike {
  /** Writes at `options.at`; returns the bytes written, which can be fewer than asked. */
  write(buffer: ArrayBuffer | ArrayBufferView, options?: { at?: number }): number;
  getSize(): number;
  flush(): void;
  close(): void;
}

export interface DirectoryHandleLike {
  readonly kind: "directory";
  entries(): AsyncIterable<[string, DirectoryHandleLike | FileHandleLike]>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandleLike>;
  removeEntry(name: string): Promise<void>;
}

/** The OPFS root; throws where the browser has no OPFS or refuses it (some private modes). */
export async function opfsRoot(): Promise<DirectoryHandleLike> {
  return (await navigator.storage.getDirectory()) as unknown as DirectoryHandleLike;
}

/** The recordings directory. With `create: false` it throws if nothing was ever recorded. */
export async function recordingsDirectory(
  directoryName: string,
  create: boolean,
): Promise<DirectoryHandleLike> {
  return (await opfsRoot()).getDirectoryHandle(directoryName, { create });
}

/** True for a thrown `DOMException` with the given name. */
export function isDomError(error: unknown, name: string): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === name;
}
