// TJ-ARCH-MOB-001 compliant
// Copy for the Background section (background-effects shape, section 7). Failure and
// unsupported lines give the cause, then what still works, then the fix.
export const BACKGROUND_COPY = {
  heading: "Background",
  hint: "Others see the background you choose.",
  needsCamera: "Background effects need a camera.",
  preparing: "Preparing background effects…",
  loading: "Loading background effects…",
  cameraOff: "Your camera is off. The background applies when you turn it on.",
  failed:
    "Background effects could not start, so your camera is shown as is. Reload the page to try again.",
  // W3 (web-conferencing-hardening): one note per cause, each with what still works and a fix.
  unsupportedBrowser:
    "This browser can’t run background effects. Your camera works normally. Effects work in current Chrome, Edge, Firefox and Safari on a computer.",
  unsupportedGraphics:
    "Background effects need graphics acceleration, which is off in this browser. Your camera works normally. Turn on hardware acceleration in your browser’s settings, then reload the page.",
} as const;
