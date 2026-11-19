import type { ConferencingSupport, Support } from "@know-meet/domain";

/**
 * What this browser can do, read without loading the media SDK, so the lobby (through the
 * lazy room) and the LiveKit adapter report the same values. Each check mirrors the library
 * that does the work, so a control is offered only where that library will not refuse it.
 */
export interface SupportOptions {
  /**
   * True when the composition root installs a background processor (wc07). Without one the
   * feature is unsupported whatever the browser can do.
   */
  readonly backgroundEffects: boolean;
}

export function detectConferencingSupport(options: SupportOptions): ConferencingSupport {
  return {
    screenShare: toSupport(canShareScreen()),
    backgroundEffects: toSupport(options.backgroundEffects && canProcessBackground()),
    speakerSelection: toSupport(canSelectSpeaker()),
  };
}

function toSupport(supported: boolean): Support {
  return supported ? "supported" : "unsupported";
}

/** `getDisplayMedia` exists; the SDK throws `DeviceUnsupportedError` without it. */
function canShareScreen(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.mediaDevices?.getDisplayMedia === "function";
}

/**
 * Mirrors livekit-client 2.24.1 `supportsAudioOutputSelection()`: `setSinkId` on media
 * elements, and not a Safari-based browser. The SDK refuses `switchActiveDevice("audiooutput")`
 * on WebKit (Safari, iOS browsers, the Tauri macOS webview) even where `setSinkId` exists, so
 * offering the control there would only fail.
 */
function canSelectSpeaker(): boolean {
  if (typeof navigator === "undefined" || typeof HTMLMediaElement === "undefined") return false;
  return "setSinkId" in HTMLMediaElement.prototype && !isSafariBased(navigator.userAgent);
}

/** The SDK's `getBrowser` order: Firefox, then Chromium, then anything WebKit. */
export function isSafariBased(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  if (/firefox|iceweasel|fxios/.test(ua)) return ua.includes("fxios");
  if (/chrom|crios|crmo/.test(ua)) return ua.includes("crios");
  return /safari|applewebkit/.test(ua);
}

let backgroundProbe: boolean | null = null;

/**
 * Mirrors `supportsBackgroundProcessors()` in @livekit/track-processors 0.8.3 (the
 * segmenter's OffscreenCanvas, VideoFrame, createImageBitmap and WebGL2, plus either the
 * insertable-streams path or the canvas fallback), without importing it: that module pulls
 * in MediaPipe. Read once; it opens a WebGL2 context to test.
 */
function canProcessBackground(): boolean {
  backgroundProbe ??= probeBackgroundProcessing();
  return backgroundProbe;
}

function probeBackgroundProcessing(): boolean {
  if (typeof document === "undefined") return false;
  const segmenter =
    "OffscreenCanvas" in globalThis &&
    "VideoFrame" in globalThis &&
    "createImageBitmap" in globalThis &&
    document.createElement("canvas").getContext("webgl2") !== null;
  const streams =
    "MediaStreamTrackGenerator" in globalThis && "MediaStreamTrackProcessor" in globalThis;
  const fallback =
    typeof HTMLCanvasElement !== "undefined" &&
    "VideoFrame" in globalThis &&
    "captureStream" in HTMLCanvasElement.prototype;
  return segmenter && (streams || fallback);
}
