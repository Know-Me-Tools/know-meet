import type { BackgroundEffectsCause, ConferencingSupport, Support } from "@know-meet/domain";

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
  // Without an installed processor the browser cannot run effects whatever its graphics.
  const cause = options.backgroundEffects ? backgroundEffectsCause() : "browser";
  return {
    screenShare: toSupport(canShareScreen()),
    backgroundEffects: toSupport(cause === null),
    backgroundEffectsCause: cause,
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

let backgroundProbe: { readonly cause: BackgroundEffectsCause | null } | null = null;

/**
 * Mirrors `supportsBackgroundProcessors()` in @livekit/track-processors 0.8.3 (the
 * segmenter's OffscreenCanvas, VideoFrame, createImageBitmap and WebGL2, plus either the
 * insertable-streams path or the canvas fallback), without importing it: that module pulls
 * in MediaPipe. Read once; it opens a WebGL2 context to test.
 *
 * Also requires hardware-accelerated WebGL (repair 9). With software WebGL (SwiftShader,
 * llvmpipe) the library's per-frame canvas read-back blocks the page for hundreds of
 * milliseconds a frame, so the meeting stops responding for as long as an effect is on
 * (evidence/wc4-profile-2026-11-20). There the feature is reported unsupported and the
 * camera works normally.
 *
 * Returns why effects cannot run (W3, web-conferencing-hardening), or null when they can:
 * `browser` for a missing feature, including no WebGL2 context at all; `graphics` when
 * WebGL2 exists but runs in software, which turning on hardware acceleration usually fixes.
 */
function backgroundEffectsCause(): BackgroundEffectsCause | null {
  backgroundProbe ??= { cause: probeBackgroundProcessing() };
  return backgroundProbe.cause;
}

function probeBackgroundProcessing(): BackgroundEffectsCause | null {
  if (typeof document === "undefined") return "browser";
  const streams =
    "MediaStreamTrackGenerator" in globalThis && "MediaStreamTrackProcessor" in globalThis;
  const fallback =
    typeof HTMLCanvasElement !== "undefined" &&
    "VideoFrame" in globalThis &&
    "captureStream" in HTMLCanvasElement.prototype;
  const features =
    "OffscreenCanvas" in globalThis &&
    globalThis.OffscreenCanvas !== undefined &&
    "VideoFrame" in globalThis &&
    "createImageBitmap" in globalThis &&
    (streams || fallback);
  if (!features) return "browser";
  const webgl = webGl2Kind();
  if (webgl === "none") return "browser";
  return webgl === "software" ? "graphics" : null;
}

/** Renderer names browsers report for software WebGL. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render driver/i;

type WebGl2Kind = "none" | "software" | "hardware";

/**
 * What WebGL2 this browser offers. `failIfMajorPerformanceCaveat` refuses a context the browser
 * would back with software; a context granted only without it is software. The renderer name
 * catches browsers that grant a software context anyway. A browser that hides the renderer name
 * is judged by the caveat alone.
 */
function webGl2Kind(): WebGl2Kind {
  const fast = document
    .createElement("canvas")
    .getContext("webgl2", { failIfMajorPerformanceCaveat: true });
  if (fast === null) {
    const any = document.createElement("canvas").getContext("webgl2");
    if (any === null) return "none";
    any.getExtension("WEBGL_lose_context")?.loseContext();
    return "software";
  }
  const info = fast.getExtension("WEBGL_debug_renderer_info");
  const renderer = info === null ? "" : String(fast.getParameter(info.UNMASKED_RENDERER_WEBGL));
  fast.getExtension("WEBGL_lose_context")?.loseContext();
  return SOFTWARE_RENDERER.test(renderer) ? "software" : "hardware";
}
