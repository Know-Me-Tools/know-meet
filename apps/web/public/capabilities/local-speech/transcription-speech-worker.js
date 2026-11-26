// Executes only in the separate, explicitly prepared browser worker.
const SAMPLES_PER_SECOND = 16_000;
const MAX_SAMPLES = SAMPLES_PER_SECOND * 4;
let pipeline = null;
let preparing = false;
let transcribing = false;

function allowPackagedFetch(files) {
  const original = globalThis.fetch.bind(globalThis);
  const allowed = new Set(files.map((path) => new URL(path, self.location.origin).href));
  globalThis.fetch = (resource, options) => {
    const originalUrl = resource instanceof Request ? resource.url : String(resource);
    const url = new URL(originalUrl, self.location.origin);
    if (url.origin !== self.location.origin || !allowed.has(url.href)) {
      return Promise.reject(new Error("unadmitted model asset"));
    }
    const method = options?.method ?? (resource instanceof Request ? resource.method : "GET");
    if (
      method.toUpperCase() !== "GET" ||
      options?.body != null ||
      (resource instanceof Request && resource.body !== null)
    ) {
      return Promise.reject(new Error("invalid model asset request"));
    }
    return original(url.href, {
      credentials: "omit",
      redirect: "error",
      signal: options?.signal ?? (resource instanceof Request ? resource.signal : undefined),
    });
  };
}

async function prepare(resources) {
  if (preparing || pipeline !== null || !resources.bundle.startsWith("/capabilities/local-speech/"))
    throw new Error("invalid profile");
  preparing = true;
  allowPackagedFetch(resources.files);
  // This bundle is a release-verified same-origin artifact; it is not loaded
  // from a CDN or discovered via model metadata.
  const speech = await import(resources.bundle);
  speech.env.allowRemoteModels = false;
  speech.env.allowLocalModels = true;
  speech.env.localModelPath = resources.modelRoot;
  speech.env.useBrowserCache = true;
  const wasm = speech.env.backends.onnx.wasm;
  wasm.wasmPaths = resources.wasmRoot;
  wasm.numThreads = 1;
  wasm.proxy = false;
  pipeline = await speech.pipeline("automatic-speech-recognition", resources.modelKey, {
    device: "webgpu",
    dtype: { encoder_model: "fp32", decoder_model_merged: "q4" },
    local_files_only: true,
  });
}

async function transcribe(samples) {
  if (
    pipeline === null ||
    transcribing ||
    !(samples instanceof Float32Array) ||
    samples.length === 0 ||
    samples.length > MAX_SAMPLES
  )
    throw new Error("ineligible samples");
  transcribing = true;
  try {
    if (!samples.some((sample) => sample !== 0)) return [];
    const duration = (samples.length * 1_000) / SAMPLES_PER_SECOND;
    const result = await pipeline(samples, { return_timestamps: "word", max_new_tokens: 96 });
    if (!result || !Array.isArray(result.chunks)) throw new Error("timed result unavailable");
    let startMs = null;
    let endMs = 0;
    let text = "";
    for (const word of result.chunks) {
      const [start, end] = Array.isArray(word?.timestamp) ? word.timestamp : [];
      if (
        typeof start !== "number" ||
        typeof end !== "number" ||
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start * 1_000 < endMs ||
        end <= start ||
        end * 1_000 > duration ||
        typeof word?.text !== "string"
      ) {
        // A model hypothesis outside its input cannot be settled. Preserve the
        // distinction from silence so the requester can see missing coverage.
        return { kind: "alignment-gap" };
      }
      startMs ??= start * 1_000;
      endMs = end * 1_000;
      text += word.text;
    }
    if (startMs !== null) return [{ startMs, endMs, text }];
    return typeof result.text === "string" && result.text.trim() !== ""
      ? { kind: "alignment-gap" }
      : [];
  } finally {
    samples.fill(0);
    transcribing = false;
  }
}

self.onmessage = async ({ data }) => {
  const { id, type } = data ?? {};
  if (!Number.isSafeInteger(id)) return;
  try {
    let result;
    if (type === "prepare") {
      await prepare(data.resources);
      result = null;
    } else if (type === "transcribe") {
      result = await transcribe(data.samples);
    } else return;
    self.postMessage({ id, ok: true, result });
  } catch {
    // No source text, audio bytes, context identifiers or URLs leave this worker.
    self.postMessage({ id, ok: false });
  }
};
