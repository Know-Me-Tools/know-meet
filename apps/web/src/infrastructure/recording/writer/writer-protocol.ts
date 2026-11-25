// TJ-ARCH-MOB-001 compliant

/** Messages the page sends to the recording writer worker. */
export type WriterRequest =
  | { readonly type: "open"; readonly fileName: string; readonly lockName: string }
  | { readonly type: "append"; readonly chunk: ArrayBuffer }
  | { readonly type: "close" };

/**
 * Why the writer stopped. `quota-exceeded`: the browser refused more bytes (a write threw
 * `QuotaExceededError` or wrote nothing). `storage-unavailable`: the file system could
 * not be opened. `failed`: anything else.
 */
export type WriterFailure = "quota-exceeded" | "storage-unavailable" | "failed";

/**
 * `failing` reports the first failure immediately, before flush and close. After `failed` the file is already closed and the lock
 * released: what was written is kept, `size` bytes of it. The worker then ignores every
 * further request.
 */
export type WriterEvent =
  | { readonly type: "opened" }
  | { readonly type: "closed"; readonly size: number }
  | { readonly type: "failing"; readonly reason: WriterFailure; readonly size: number }
  | { readonly type: "failed"; readonly reason: WriterFailure; readonly size: number };
