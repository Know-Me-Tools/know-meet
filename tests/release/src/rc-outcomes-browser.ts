import type { BrowserContext, Page } from "@playwright/test";
import { blocked } from "./release-env.ts";

export interface OutcomeBrowserOptions {
  holdClose?: boolean;
  holdStop?: boolean;
  deliverChunks?: number;
  headerOnly?: boolean;
  failOnStopClick?: boolean;
}

export interface OutcomeEvent {
  readonly kind: string;
  readonly at: number;
  readonly detail?: string | undefined;
  readonly bytes?: number | undefined;
}

type FileDigest = { bytes: number; sha256: string };
interface OutcomeBrowser {
  readonly options: OutcomeBrowserOptions;
  readonly events: OutcomeEvent[];
  releaseWriter(): void;
  releaseEncoder(): void;
  failEncoder(): void;
  prefix(): Promise<FileDigest>;
  captureTracks(): { id: string; kind: string; readyState: string }[];
  watchTrackIds(ids: string[]): void;
}

type OutcomeWindow = Window & { __kmOutcomeBrowser?: OutcomeBrowser };

export const TRACK_STOP_TRACE = "rc-native-track-stop ";

/** Holds delay delivery at the browser boundary while preserving the native encoder and OPFS. */
export async function installOutcomeBrowser(context: BrowserContext): Promise<void> {
  await context.addInitScript((trackPrefix) => {
    const options: OutcomeBrowserOptions = {};
    const events: OutcomeEvent[] = [];
    const record = (kind: string, detail?: string, bytes?: number): void => {
      events.push({ kind, at: performance.timeOrigin + performance.now(), detail, bytes });
    };
    const pendingClose: (() => void)[] = [];
    const pendingEncoder: (() => void)[] = [];
    const prefixChunks: ArrayBuffer[] = [];
    const indexChanges = new BroadcastChannel("know-meet-recording-changes");
    indexChanges.addEventListener(
      "message",
      (event: MessageEvent<{ kind?: string; id?: string }>) => {
        if (event.data.kind === "changed") record("recording-index-changed", event.data.id);
      },
    );
    function injectFailure(): void {
      if (recorder === undefined) throw new Error("No observed recorder");
      record("fault-encoder");
      recorder.dispatchEvent(new Event("error"));
    }

    function headerOf(bytes: ArrayBuffer): ArrayBuffer | null {
      const payload = new Uint8Array(bytes);
      if (
        payload[0] !== 0x1a ||
        payload[1] !== 0x45 ||
        payload[2] !== 0xdf ||
        payload[3] !== 0xa3
      ) {
        return null;
      }
      for (let offset = 4; offset < payload.length - 3; offset += 1) {
        if (
          payload[offset] === 0x1f &&
          payload[offset + 1] === 0x43 &&
          payload[offset + 2] === 0xb6 &&
          payload[offset + 3] === 0x75
        ) {
          return bytes.slice(0, offset);
        }
      }
      return null;
    }
    let recorder: MediaRecorder | undefined;
    let encoderStopping = false;
    let delivered = 0;
    const tracked = new Set<MediaStreamTrack>();
    const additionalTrackIds = new Set<string>();
    const nativeTrackStop = MediaStreamTrack.prototype.stop;
    MediaStreamTrack.prototype.stop = function () {
      nativeTrackStop.call(this);
      if (tracked.has(this) || additionalTrackIds.has(this.id)) {
        record("capture-track-stop", this.id);
        // biome-ignore lint/suspicious/noConsole: CDP collects this teardown receipt after the page is destroyed.
        console.info(
          trackPrefix + JSON.stringify({ id: this.id, kind: this.kind, state: this.readyState }),
        );
      }
    };

    // LiveKit's incoming TextStreamReader decodes the delivered control message before
    // the app handles it. Observe that text without modifying it or depending on RTC framing.
    const decode = TextDecoder.prototype.decode;
    TextDecoder.prototype.decode = function (input, options) {
      const text = decode.call(this, input, options);
      if (/^\{"v":\d+,"type":"record-(?:request|answer)"[^{}]+\}$/.test(text)) {
        record("consent-received", text);
      }
      return text;
    };

    const NativeRecorder = window.MediaRecorder;
    window.MediaRecorder = class extends NativeRecorder {
      constructor(stream: MediaStream, settings?: MediaRecorderOptions) {
        super(stream, settings);
        recorder = this;
        encoderStopping = false;
        delivered = 0;
        for (const track of stream.getTracks()) tracked.add(track);
        this.addEventListener("start", () => record("encoder-start", this.mimeType));
        this.addEventListener("error", () => record("encoder-error"));
        this.addEventListener(
          "dataavailable",
          (event) => {
            if (!event.isTrusted) return;
            const bytes = event.data.size;
            if (options.holdStop && encoderStopping) {
              record("encoder-chunk-held", undefined, bytes);
              event.stopImmediatePropagation();
              pendingEncoder.push(() =>
                this.dispatchEvent(new BlobEvent("dataavailable", { data: event.data })),
              );
              return;
            }
            if (bytes > 0 && delivered < (options.deliverChunks ?? Infinity)) {
              delivered += 1;
              record("encoder-chunk", undefined, bytes);
            } else if (bytes > 0) {
              record("encoder-chunk-suppressed", undefined, bytes);
              event.stopImmediatePropagation();
            }
          },
          true,
        );
        this.addEventListener(
          "stop",
          (event) => {
            record("encoder-stopped");
            if (event.isTrusted && options.holdStop) {
              event.stopImmediatePropagation();
              pendingEncoder.push(() => this.dispatchEvent(new Event("stop")));
            }
          },
          true,
        );
      }

      override stop(): void {
        encoderStopping = true;
        record("encoder-stop-called");
        super.stop();
      }
    };

    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, settings?: WorkerOptions) {
        super(url, settings);
        if (settings?.name !== "know-meet-recording-writer") return;
        const post = this.postMessage.bind(this);
        this.postMessage = (
          message: unknown,
          transfer?: StructuredSerializeOptions | Transferable[],
        ) => {
          const request = message as { type?: string; fileName?: string; chunk?: ArrayBuffer };
          if (request.type === "close") {
            record("writer-close-request");
            if (options.holdClose) {
              pendingClose.push(() => {
                record("writer-close-release");
                post(message);
              });
              return;
            }
          }
          if (request.type === "open") record("writer-open-request", request.fileName);
          if (request.type === "append" && request.chunk !== undefined) {
            if (options.headerOnly) {
              if (prefixChunks.length > 0) return;
              const header = headerOf(request.chunk);
              if (header === null) {
                record("writer-header-unresolved");
                return;
              }
              record("writer-header-only", undefined, header.byteLength);
              prefixChunks.push(header.slice(0));
              post({ type: "append", chunk: header }, [header]);
              return;
            }
            record("writer-append", undefined, request.chunk.byteLength);
            prefixChunks.push(request.chunk.slice(0));
          }
          if (Array.isArray(transfer)) post(message, transfer);
          else if (transfer === undefined) post(message);
          else post(message, transfer);
        };
        this.addEventListener(
          "message",
          (event: MessageEvent<{ type: string; reason?: string; size?: number }>) => {
            record(`writer-${event.data.type}`, event.data.reason, event.data.size);
          },
        );
      }
    };

    const selectors = {
      indicator: '[data-testid="km-recording-indicator"]',
      notice: '[role="status"][aria-live="off"]',
      remote: '[data-testid="km-remote-tile"]',
    };
    let indicator = false;
    let notice = "";
    let remoteIds = "";
    const scan = (): void => {
      const visible =
        (document.querySelector(selectors.indicator)?.getClientRects().length ?? 0) > 0;
      if (indicator !== visible) {
        indicator = visible;
        record(visible ? "indicator-on" : "indicator-off");
      }
      const status =
        Array.from(document.querySelectorAll(selectors.notice)).find(
          (element) =>
            element.getClientRects().length > 0 &&
            /Recording failed\.|Recording stopped because browser storage ran out\./.test(
              element.textContent ?? "",
            ),
        )?.textContent ?? "";
      if (status !== "" && status !== notice) record("failure-notice", status);
      notice = status;
      const nextIds = Array.from(document.querySelectorAll(selectors.remote))
        .map((element) => element.getAttribute("data-participant-identity") ?? "")
        .sort()
        .join(",");
      if (nextIds !== remoteIds) {
        remoteIds = nextIds;
        record("remote-membership", remoteIds);
      }
    };
    new MutationObserver(scan).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
    });
    document.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const clicked = event.target.closest("[data-testid]");
        const id = clicked?.getAttribute("data-testid");
        if (id === "km-room-record" && clicked?.getAttribute("data-state") === "on") {
          if (options.failOnStopClick) {
            options.failOnStopClick = false;
            injectFailure();
          }
          record("action-stop");
        }
        if (id === "km-room-leave" || id === "km-room-leave-confirm") record("action-leave", id);
        if (id === "km-lobby-join") record("action-join");
        if (id === "km-recording-consent-decline") record("action-decline");
      },
      true,
    );

    (window as OutcomeWindow).__kmOutcomeBrowser = {
      options,
      events,
      releaseWriter: () => {
        options.holdClose = false;
        for (const send of pendingClose.splice(0)) send();
      },
      releaseEncoder: () => {
        options.holdStop = false;
        for (const send of pendingEncoder.splice(0)) send();
      },
      failEncoder: injectFailure,
      prefix: async () => {
        const bytes = await new Blob(prefixChunks).arrayBuffer();
        const hash = await crypto.subtle.digest("SHA-256", bytes);
        return {
          bytes: bytes.byteLength,
          sha256: Array.from(new Uint8Array(hash), (value) =>
            value.toString(16).padStart(2, "0"),
          ).join(""),
        };
      },
      captureTracks: () =>
        [...tracked].map(({ id, kind, readyState }) => ({ id, kind, readyState })),
      watchTrackIds: (ids) => {
        for (const id of ids) additionalTrackIds.add(id);
      },
    };
  }, TRACK_STOP_TRACE);
}

export async function configureOutcomeBrowser(
  page: Page,
  options: OutcomeBrowserOptions,
): Promise<void> {
  const configured = await page.evaluate((value) => {
    const observer = (window as OutcomeWindow).__kmOutcomeBrowser;
    if (observer === undefined) return false;
    Object.assign(observer.options, value);
    return true;
  }, options);
  if (!configured) throw blocked("recording browser observer is unavailable");
}

export async function readOutcomeBrowser(page: Page): Promise<OutcomeEvent[]> {
  const events = await page.evaluate(() => (window as OutcomeWindow).__kmOutcomeBrowser?.events);
  if (events === undefined) throw blocked("recording browser observer is unavailable");
  return events;
}

async function runOutcomeAction(
  page: Page,
  action: "releaseWriter" | "releaseEncoder" | "failEncoder",
): Promise<void> {
  const ran = await page.evaluate((name) => {
    const observer = (window as OutcomeWindow).__kmOutcomeBrowser;
    if (observer === undefined) return false;
    observer[name]();
    return true;
  }, action);
  if (!ran) throw blocked("recording browser observer is unavailable");
}

export async function releaseOutcomeWriter(page: Page): Promise<void> {
  await runOutcomeAction(page, "releaseWriter");
}

export async function releaseOutcomeEncoder(page: Page): Promise<void> {
  await runOutcomeAction(page, "releaseEncoder");
}

export async function injectEncoderFailure(page: Page): Promise<void> {
  await runOutcomeAction(page, "failEncoder");
}

export async function writerPrefix(page: Page): Promise<FileDigest> {
  const prefix = await page.evaluate(() => (window as OutcomeWindow).__kmOutcomeBrowser?.prefix());
  if (prefix === undefined) throw blocked("recording browser observer is unavailable");
  return prefix;
}

export async function browserCaptureTracks(page: Page) {
  const tracks = await page.evaluate(() =>
    (window as OutcomeWindow).__kmOutcomeBrowser?.captureTracks(),
  );
  if (tracks === undefined) throw blocked("recording browser observer is unavailable");
  return tracks;
}

export async function watchCaptureTrackIds(page: Page, ids: string[]): Promise<void> {
  const watching = await page.evaluate((value) => {
    const observer = (window as OutcomeWindow).__kmOutcomeBrowser;
    if (observer === undefined) return false;
    observer.watchTrackIds(value);
    return true;
  }, ids);
  if (!watching) throw blocked("recording browser observer is unavailable");
}

/** Apply QuotaExceededError on the native worker's next OPFS write. */
export async function exhaustNextWriterAppend(page: Page): Promise<void> {
  const workers = page.workers().filter((worker) => /opfs-writer-worker/.test(worker.url()));
  const [worker] = workers;
  if (workers.length !== 1 || worker === undefined)
    throw blocked("could not select one active production OPFS writer worker");
  const armed = await worker.evaluate(() => {
    const global = globalThis as unknown as {
      FileSystemSyncAccessHandle?: { prototype: { write: (...args: unknown[]) => number } };
    };
    const handle = global.FileSystemSyncAccessHandle;
    if (handle === undefined) return false;
    handle.prototype.write = () => {
      throw new DOMException("Recording fixture quota reached", "QuotaExceededError");
    };
    return true;
  });
  if (!armed) throw blocked("pinned worker does not expose synchronous OPFS writes");
}

export async function readRecordedFile(page: Page, fileName: string): Promise<FileDigest> {
  return page.evaluate(async (name) => {
    const directory = await (await navigator.storage.getDirectory()).getDirectoryHandle(
      "know-meet-recordings",
    );
    const file = await (await directory.getFileHandle(name)).getFile();
    const bytes = await file.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return {
      bytes: bytes.byteLength,
      sha256: Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join(
        "",
      ),
    };
  }, fileName);
}

export async function recordedFileBytes(page: Page, fileName: string): Promise<number[]> {
  return page.evaluate(async (name) => {
    const directory = await (await navigator.storage.getDirectory()).getDirectoryHandle(
      "know-meet-recordings",
    );
    const file = await (await directory.getFileHandle(name)).getFile();
    return [...new Uint8Array(await file.arrayBuffer())];
  }, fileName);
}
