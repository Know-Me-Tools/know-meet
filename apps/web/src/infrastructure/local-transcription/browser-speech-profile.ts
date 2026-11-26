export function supportsLocalSpeechCapture(): boolean {
  return (
    globalThis.isSecureContext === true &&
    typeof AudioContext === "function" &&
    typeof Worker === "function" &&
    typeof WebAssembly === "object" &&
    "gpu" in navigator &&
    /\b(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent) &&
    !/Android|Mobile|iPhone|iPad/.test(navigator.userAgent)
  );
}
