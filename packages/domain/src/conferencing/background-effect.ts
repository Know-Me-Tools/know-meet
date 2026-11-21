/**
 * What the participant wants done to their camera background (WC-4).
 *
 * - `none`: the camera as captured.
 * - `blur`: the background blurred, the person kept sharp.
 * - `image`: the background replaced. `imageUrl` is a same-origin path to a preset image
 *   shipped with the app, or a `blob:` URL for an image the participant picked. It never
 *   points at another origin (CSP, `img-src 'self' blob:`).
 */
export type BackgroundEffect =
  | { readonly kind: "none" }
  | { readonly kind: "blur" }
  | { readonly kind: "image"; readonly imageUrl: string };

export const NO_BACKGROUND_EFFECT: BackgroundEffect = { kind: "none" };
export const BACKGROUND_BLUR: BackgroundEffect = { kind: "blur" };

/** Accepts only a root-relative path or a `blob:` URL; anything else returns null. */
export function backgroundImage(imageUrl: string): BackgroundEffect | null {
  const isRootRelative = imageUrl.startsWith("/") && !imageUrl.startsWith("//");
  const isBlob = imageUrl.startsWith("blob:");
  if (!isRootRelative && !isBlob) return null;
  return { kind: "image", imageUrl };
}

/**
 * Where the requested effect is on the published camera.
 *
 * - `idle`: no effect requested (`none`).
 * - `pending`: requested, waiting for a camera track (camera off, or being replaced).
 * - `applying`: loading the processor or its assets.
 * - `active`: the published camera carries the effect.
 * - `failed`: the processor could not start; the camera is sent without an effect.
 */
export type BackgroundEffectStatus = "idle" | "pending" | "applying" | "active" | "failed";

export interface BackgroundEffectState {
  readonly effect: BackgroundEffect;
  readonly status: BackgroundEffectStatus;
}

export const NO_BACKGROUND_EFFECT_STATE: BackgroundEffectState = {
  effect: NO_BACKGROUND_EFFECT,
  status: "idle",
};

export function sameBackgroundEffect(a: BackgroundEffect, b: BackgroundEffect): boolean {
  if (a.kind === "image" && b.kind === "image") return a.imageUrl === b.imageUrl;
  return a.kind === b.kind;
}
