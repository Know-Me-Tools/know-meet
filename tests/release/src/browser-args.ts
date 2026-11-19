/**
 * Chromium launch arguments shared by the playwright config and by the WC specs
 * that launch their own browser (device lists, autoplay policy, camera file).
 * Arguments carry no secret.
 */

/** Chromium fake camera and microphone; the fake UI flag auto-accepts the prompt. */
export const FAKE_MEDIA_ARGS: readonly string[] = [
  "--use-fake-device-for-media-stream",
  "--use-fake-ui-for-media-stream",
];

/**
 * WC-1 screen capture without a picker. ASSUMPTION: "Entire screen" is the source
 * name Chromium offers to headless runs; if the boundary run shows another name,
 * change it here only.
 */
export const AUTO_SELECT_SCREEN_ARGS: readonly string[] = [
  "--auto-select-desktop-capture-source=Entire screen",
];

/**
 * WC-5 and WC-6 need more than one device of each kind to prove a choice. This
 * replaces FAKE_MEDIA_ARGS (the device-count form of the same flag), so do not
 * pass both.
 */
export const MULTI_DEVICE_ARGS: readonly string[] = [
  "--use-fake-device-for-media-stream=device-count=3",
  "--use-fake-ui-for-media-stream",
];

/** WC-12: audio may not start without a user activation on the page. */
export const AUTOPLAY_BLOCKED_ARG = "--autoplay-policy=document-user-activation-required";

/** WC-12 negative control: audio may start at once. */
export const AUTOPLAY_ALLOWED_ARG = "--autoplay-policy=no-user-gesture-required";

/** WC-4: a fixed camera picture, so the pre-effect frame is repeatable. */
export function cameraFileArg(path: string): string {
  return `--use-file-for-fake-video-capture=${path}`;
}
