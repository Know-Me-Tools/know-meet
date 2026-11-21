/**
 * Page taps for the WC scenarios, installed with addInitScript before any
 * application code runs. They observe the browser, not the application, so an
 * oracle built on them does not trust the code under test:
 *
 *   wire     every message received on any RTCDataChannel (where LiveKit text
 *            streams travel); WC-3 reads it to prove a private message never
 *            reached a third participant's browser.
 *   gum      every track getUserMedia returned, with its deviceId; WC-5 reads
 *            the active device from it.
 *   recorder MediaRecorder constructions, starts, stops and bytes; WC-8 and WC-9
 *            read it to prove a recording did or did not start.
 *   csp      securitypolicyviolation events (documents only; worker violations
 *            reach the console, see wc-network.ts).
 *   egress   every body handed to fetch, XHR, sendBeacon and WebSocket.send,
 *            including Blob bodies that Playwright cannot show; WC-7 and WC-8
 *            read it to prove history and recording bytes stay on the device.
 *
 * The page source is a string on purpose: it runs in the page, uses no
 * application import and is not type-checked against the DOM lib.
 */
import type { BrowserContext, Page } from "@playwright/test";

const TAPS_SOURCE = `(() => {
  if (window.__kmTaps) return;
  const MAX = 5000;
  const BODY_TEXT_LIMIT = 65536;
  const taps = {
    wire: [],
    gum: [],
    csp: [],
    egress: [],
    recorder: { constructed: 0, started: 0, stopped: 0, bytes: 0 },
  };
  const liveTracks = [];
  window.__kmTaps = taps;
  window.__kmLiveTracks = liveTracks;
  const push = (list, item) => { if (list.length < MAX) list.push(item); };
  const decoder = new TextDecoder("utf-8", { fatal: false });

  const tapChannel = (channel) => {
    channel.addEventListener("message", (event) => {
      const data = event.data;
      const record = (text) => push(taps.wire, { label: channel.label, text, t: Date.now() });
      if (typeof data === "string") record(data);
      else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) record(decoder.decode(data));
      else if (typeof Blob !== "undefined" && data instanceof Blob) {
        data.arrayBuffer().then((buffer) => record(decoder.decode(buffer)));
      }
    });
  };
  const NativePc = window.RTCPeerConnection;
  if (NativePc) {
    const WrappedPc = function (...args) {
      const pc = new NativePc(...args);
      pc.addEventListener("datachannel", (event) => tapChannel(event.channel));
      const create = pc.createDataChannel.bind(pc);
      pc.createDataChannel = (...a) => { const ch = create(...a); tapChannel(ch); return ch; };
      return pc;
    };
    WrappedPc.prototype = NativePc.prototype;
    Object.setPrototypeOf(WrappedPc, NativePc);
    window.RTCPeerConnection = WrappedPc;
  }

  const devices = navigator.mediaDevices;
  if (devices && devices.getUserMedia) {
    const nativeGum = devices.getUserMedia.bind(devices);
    devices.getUserMedia = async (constraints) => {
      const stream = await nativeGum(constraints);
      for (const track of stream.getTracks()) {
        const settings = track.getSettings();
        push(taps.gum, { kind: track.kind, deviceId: settings.deviceId || "", groupId: settings.groupId || "", label: track.label, t: Date.now() });
        liveTracks.push(track);
      }
      return stream;
    };
  }

  const NativeRecorder = window.MediaRecorder;
  if (NativeRecorder) {
    class TappedRecorder extends NativeRecorder {
      constructor(...args) {
        super(...args);
        taps.recorder.constructed += 1;
        this.addEventListener("start", () => { taps.recorder.started += 1; });
        this.addEventListener("stop", () => { taps.recorder.stopped += 1; });
        this.addEventListener("dataavailable", (event) => { taps.recorder.bytes += event.data.size; });
      }
    }
    TappedRecorder.isTypeSupported = NativeRecorder.isTypeSupported.bind(NativeRecorder);
    window.MediaRecorder = TappedRecorder;
  }

  document.addEventListener("securitypolicyviolation", (event) => {
    push(taps.csp, { directive: event.violatedDirective, blocked: event.blockedURI, source: event.sourceFile || "" });
  });

  const describeBody = (body) => {
    if (body === null || body === undefined) return { kind: "none", size: 0 };
    if (typeof body === "string") return { kind: "string", size: body.length, text: body.slice(0, BODY_TEXT_LIMIT) };
    if (body instanceof URLSearchParams) { const text = body.toString(); return { kind: "string", size: text.length, text: text.slice(0, BODY_TEXT_LIMIT) }; }
    if (typeof Blob !== "undefined" && body instanceof Blob) return { kind: "blob", size: body.size, type: body.type };
    if (body instanceof ArrayBuffer) return { kind: "arraybuffer", size: body.byteLength };
    if (ArrayBuffer.isView(body)) return { kind: "view", size: body.byteLength };
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      let size = 0; let text = ""; let type = "";
      for (const [, value] of body.entries()) {
        if (typeof value === "string") { size += value.length; text += value; }
        else { size += value.size; type = type || value.type; }
      }
      return { kind: "formdata", size, text: text.slice(0, BODY_TEXT_LIMIT), type };
    }
    return { kind: "other", size: -1 };
  };
  const note = (via, url, method, body) => {
    try { push(taps.egress, { via, url: String(url), method, ...describeBody(body) }); } catch (error) { /* a tap never breaks the page */ }
  };

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init && init.method) || (typeof input === "object" && input.method) || "GET";
    note("fetch", url, method, init ? init.body : null);
    return nativeFetch(input, init);
  };
  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__kmTarget = { method, url };
    return nativeOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (body) {
    const target = this.__kmTarget || { method: "", url: "" };
    note("xhr", target.url, target.method, body);
    return nativeSend.call(this, body);
  };
  if (navigator.sendBeacon) {
    const nativeBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => { note("beacon", url, "POST", data); return nativeBeacon(url, data); };
  }
  const nativeWsSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    note("websocket", this.url, "SEND", data);
    return nativeWsSend.call(this, data);
  };
})();`;

export async function installTaps(context: BrowserContext): Promise<void> {
  await context.addInitScript({ content: TAPS_SOURCE });
}

export interface WireMessage {
  readonly label: string;
  readonly text: string;
}

export interface GumEntry {
  readonly kind: string;
  readonly deviceId: string;
  readonly groupId: string;
  readonly label: string;
}

export interface CspViolation {
  readonly directive: string;
  readonly blocked: string;
  readonly source: string;
}

export interface EgressEntry {
  readonly via: string;
  readonly url: string;
  readonly method: string;
  readonly kind: string;
  readonly size: number;
  readonly text?: string;
  readonly type?: string;
}

export interface RecorderLog {
  readonly constructed: number;
  readonly started: number;
  readonly stopped: number;
  readonly bytes: number;
}

export interface TapSnapshot {
  readonly wire: readonly WireMessage[];
  readonly gum: readonly GumEntry[];
  readonly csp: readonly CspViolation[];
  readonly egress: readonly EgressEntry[];
  readonly recorder: RecorderLog;
}

const EMPTY_SNAPSHOT: TapSnapshot = {
  wire: [],
  gum: [],
  csp: [],
  egress: [],
  recorder: { constructed: 0, started: 0, stopped: 0, bytes: 0 },
};

/** The page's taps as plain data. A page that has not run the tap yet reads as empty. */
export async function readTaps(page: Page): Promise<TapSnapshot> {
  const raw: unknown = await page.evaluate(
    "window.__kmTaps ? JSON.parse(JSON.stringify(window.__kmTaps)) : null",
  );
  return isTapSnapshot(raw) ? raw : EMPTY_SNAPSHOT;
}

function isTapSnapshot(value: unknown): value is TapSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record["wire"]) &&
    Array.isArray(record["gum"]) &&
    Array.isArray(record["csp"]) &&
    Array.isArray(record["egress"]) &&
    typeof record["recorder"] === "object"
  );
}

/** deviceId of the newest still-live track of a kind, or null when none is live. */
export async function activeDeviceId(page: Page, kind: "audio" | "video"): Promise<string | null> {
  const result: unknown = await page.evaluate(`(() => {
    const tracks = (window.__kmLiveTracks || []).filter((t) => t.kind === ${JSON.stringify(kind)} && t.readyState === "live");
    const last = tracks[tracks.length - 1];
    return last ? last.getSettings().deviceId || "" : null;
  })()`);
  return typeof result === "string" ? result : null;
}

/** groupId of the default device of a kind, from enumerateDevices. */
export async function defaultGroupId(
  page: Page,
  kind: "audioinput" | "videoinput",
): Promise<string> {
  const result: unknown = await page.evaluate(`(async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    const ofKind = all.filter((d) => d.kind === ${JSON.stringify(kind)});
    const chosen = ofKind.find((d) => d.deviceId === "default") || ofKind[0];
    return chosen ? chosen.groupId : "";
  })()`);
  return typeof result === "string" ? result : "";
}

/** groupId of the device a deviceId names, from enumerateDevices. */
export async function groupIdOf(page: Page, deviceId: string): Promise<string> {
  const result: unknown = await page.evaluate(`(async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    const found = all.find((d) => d.deviceId === ${JSON.stringify(deviceId)});
    return found ? found.groupId : "";
  })()`);
  return typeof result === "string" ? result : "";
}

export interface OpfsEntry {
  readonly path: string;
  readonly size: number;
}

/** Every file in the origin private file system, recursively. Independent of the app's own index. */
export async function opfsEntries(page: Page): Promise<readonly OpfsEntry[]> {
  const result: unknown = await page.evaluate(`(async () => {
    const out = [];
    const walk = async (dir, prefix) => {
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === "directory") await walk(handle, prefix + name + "/");
        else out.push({ path: prefix + name, size: (await handle.getFile()).size });
      }
    };
    await walk(await navigator.storage.getDirectory(), "");
    return out;
  })()`);
  if (!Array.isArray(result)) return [];
  return result.filter(
    (e): e is OpfsEntry =>
      typeof e === "object" &&
      e !== null &&
      typeof (e as Record<string, unknown>)["path"] === "string" &&
      typeof (e as Record<string, unknown>)["size"] === "number",
  );
}
