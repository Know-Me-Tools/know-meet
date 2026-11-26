import type { LocalSpeechEndpoint } from "./speech-ingress";

const RESOURCE_ROOT = "/capabilities/local-speech/";
const ENTRY = `${RESOURCE_ROOT}transcription-speech-worker.js`;
const MAX_MANIFEST_BYTES = 128 * 1024;
const SHA256 = /^[0-9a-f]{64}$/;

export interface SpeechRuntimeResources {
  readonly bundle: string;
  readonly modelRoot: string;
  readonly modelKey: string;
  readonly wasmRoot: string;
  readonly files: readonly string[];
}

interface PreparationOptions {
  /** The adapter passed this signal only after explicit opt-in. */
  readonly signal: AbortSignal;
  readonly verifiedManifestDigest: string;
  readonly manifestPath: string;
}

function scopedPath(value: unknown): value is string {
  // The manifest can only point to packaged assets beneath the fixed local prefix.
  return (
    typeof value === "string" &&
    value.startsWith(RESOURCE_ROOT) &&
    /^\/[a-zA-Z0-9_.\-/]+$/.test(value) &&
    !value.split("/").some((part) => part === ".." || part === ".") &&
    value.length <= 256
  );
}

function readResources(value: unknown): SpeechRuntimeResources | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const { assetRevision, bundle, modelRoot, modelKey, wasmRoot, files } = value as Record<
    string,
    unknown
  >;
  if (typeof assetRevision !== "string" || !SHA256.test(assetRevision)) return null;
  const base = `${RESOURCE_ROOT}${assetRevision}/`;
  if (
    !scopedPath(bundle) ||
    !bundle.startsWith(base) ||
    !bundle.endsWith(".js") ||
    !scopedPath(modelRoot) ||
    !modelRoot.startsWith(base) ||
    !modelRoot.endsWith("/") ||
    !scopedPath(wasmRoot) ||
    !wasmRoot.startsWith(base) ||
    !wasmRoot.endsWith("/") ||
    typeof modelKey !== "string" ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(modelKey) ||
    !Array.isArray(files) ||
    files.length === 0 ||
    files.length > 64 ||
    !files.every(
      (path) => scopedPath(path) && (path.startsWith(modelRoot) || path.startsWith(wasmRoot)),
    ) ||
    new Set(files).size !== files.length
  )
    return null;
  return { bundle, modelRoot, modelKey, wasmRoot, files };
}

async function prepareManifest(options: PreparationOptions): Promise<SpeechRuntimeResources> {
  const { signal, verifiedManifestDigest, manifestPath } = options;
  signal.throwIfAborted();
  if (
    !SHA256.test(verifiedManifestDigest) ||
    !scopedPath(manifestPath) ||
    !manifestPath.endsWith(".json")
  )
    throw new Error("manifest not admitted");
  const response = await fetch(manifestPath, {
    signal,
    credentials: "omit",
    redirect: "error",
  });
  if (!response.ok) throw new Error("manifest unavailable");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("manifest missing");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_MANIFEST_BYTES) {
        await reader.cancel();
        throw new Error("manifest exceeds scope");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const actual = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (actual !== verifiedManifestDigest) throw new Error("manifest digest mismatch");
  const resources = readResources(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
  );
  if (resources === null) throw new Error("manifest resources not admitted");
  return resources;
}

interface PendingReply {
  readonly requestId: number;
  readonly settle: (value: unknown) => void;
  readonly reject: (reason: Error) => void;
}

/** Start explicitly after model download consent; never auto-select a provider. */
export async function openLocalSpeechWorker(
  options: PreparationOptions,
): Promise<LocalSpeechEndpoint> {
  const resources = await prepareManifest(options);
  options.signal.throwIfAborted();
  const worker = new Worker(ENTRY, { type: "module" });
  let pending: PendingReply | null = null;
  let id = 0;
  let closed = false;
  const shutdown = () => {
    if (closed) return;
    closed = true;
    worker.terminate();
    pending?.reject(new Error("local speech worker stopped"));
    pending = null;
  };
  worker.onmessage = (event: MessageEvent<unknown>) => {
    const value = event.data;
    if (
      typeof value !== "object" ||
      value === null ||
      !("id" in value) ||
      pending === null ||
      value.id !== pending.requestId
    )
      return;
    const completing = pending;
    pending = null;
    if ("ok" in value && value.ok === true && "result" in value) completing.settle(value.result);
    else completing.reject(new Error("local speech worker failed"));
  };
  worker.onerror = shutdown;
  worker.onmessageerror = shutdown;

  const send = async (message: object, signal: AbortSignal, buffers: Transferable[] = []) => {
    if (closed || pending !== null || signal.aborted) throw new Error("local worker unavailable");
    const requestId = ++id;
    const handleAbort = () => shutdown();
    signal.addEventListener("abort", handleAbort, { once: true });
    try {
      return await new Promise<unknown>((settle, reject) => {
        pending = { requestId, settle, reject };
        try {
          worker.postMessage({ id: requestId, ...message }, buffers);
        } catch (problem) {
          pending = null;
          reject(problem);
        }
      });
    } finally {
      signal.removeEventListener("abort", handleAbort);
    }
  };

  const initializing = AbortSignal.any([options.signal, AbortSignal.timeout(120_000)]);
  try {
    await send({ type: "prepare", resources }, initializing);
  } catch (problem) {
    shutdown();
    throw problem;
  }
  return {
    transcribe: async (samples, signal) => {
      const transferable = new Float32Array(samples);
      return send({ type: "transcribe", samples: transferable }, signal, [transferable.buffer]);
    },
    close: shutdown,
  };
}
