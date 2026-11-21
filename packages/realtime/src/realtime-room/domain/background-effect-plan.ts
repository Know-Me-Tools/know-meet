import type { BackgroundEffect, BackgroundEffectStatus } from "@know-meet/domain";

/** The published camera as the effect controller sees it. */
export type CameraState = "none" | "off" | "on";

/** What the controller knows about the camera track it looks at now. */
export interface EffectFacts {
  readonly requested: BackgroundEffect;
  readonly camera: CameraState;
  /** This track carries a processor the hook set, for the requested effect. */
  readonly appliedHere: boolean;
  /** The hook set a processor on this track (for any effect) that is still there. */
  readonly processorHere: boolean;
  /** Applying the requested effect to this track already failed. */
  readonly failedHere: boolean;
}

/**
 * The next step, and the status to show while it runs or once it is done.
 * - `remove`: take our processor off this track.
 * - `apply`: put the requested effect on this track.
 * - `none`: nothing to do.
 */
export interface EffectPlan {
  readonly action: "remove" | "apply" | "none";
  readonly status: BackgroundEffectStatus;
}

/**
 * Keeps the requested effect true on whatever camera track is published. A muted camera keeps
 * its processor (the SDK restarts it with the device), so it is only `pending` there. A track
 * that lost its processor, or a new track (republished after a reconnect), gets it again. A
 * failure is not retried on the same track until the request changes, so a broken processor
 * cannot loop.
 */
export function planBackgroundEffect(facts: EffectFacts): EffectPlan {
  if (facts.requested.kind === "none") {
    return { action: facts.processorHere ? "remove" : "none", status: "idle" };
  }
  if (facts.camera !== "on") return { action: "none", status: "pending" };
  if (facts.appliedHere) return { action: "none", status: "active" };
  if (facts.failedHere) return { action: "none", status: "failed" };
  return { action: "apply", status: "applying" };
}
