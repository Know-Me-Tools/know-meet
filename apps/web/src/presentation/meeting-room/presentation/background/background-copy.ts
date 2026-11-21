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
  unsupported:
    "Background effects aren’t available on this device. Your camera works normally. Effects need graphics acceleration, which current Chrome, Edge, Firefox and Safari on a computer usually have.",
} as const;
