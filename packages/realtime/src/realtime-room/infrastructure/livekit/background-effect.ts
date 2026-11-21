import type { BackgroundEffectError } from "@know-meet/application";
import {
  type BackgroundEffect,
  type BackgroundEffectState,
  type BackgroundEffectStatus,
  type ConferencingSupport,
  conferencingErrors,
  err,
  meetingErrors,
  NO_BACKGROUND_EFFECT,
  NO_BACKGROUND_EFFECT_STATE,
  ok,
  type Result,
  sameBackgroundEffect,
} from "@know-meet/domain";
import { type LocalVideoTrack, type Room, Track } from "livekit-client";
import { type CameraState, planBackgroundEffect } from "../../domain/background-effect-plan.ts";
import { errorName } from "../../domain/error-mapping.ts";
import type { SessionHost } from "./session-host.ts";
import type { ProcessedBackgroundEffect, VideoProcessorHook } from "./video-processor-hook.ts";

/** The background effect request and the controller that keeps it true (WC-4). */
export interface BackgroundEffects {
  state(): BackgroundEffectState;
  /** Called by every refresh: looks at the camera track and starts the next step if one is due. */
  reconcile(room: Room | null): void;
  /** Forgets the request (a new connect, or leaving). */
  reset(): void;
  setBackgroundEffect(effect: BackgroundEffect): Promise<Result<void, BackgroundEffectError>>;
  /**
   * Prepares the processor on the published camera when nothing else is due (repair 9): the
   * one-time GPU program build then happens while the Background section shows "Preparing",
   * not after the person chooses. Resolves once it ran, or at once when there is no camera on.
   */
  prepareBackgroundEffects(): Promise<void>;
}

interface Applied {
  readonly track: LocalVideoTrack;
  readonly effect: ProcessedBackgroundEffect;
}

interface Camera {
  readonly track: LocalVideoTrack | null;
  readonly state: CameraState;
}

function readCamera(room: Room | null): Camera {
  const publication = room?.localParticipant.getTrackPublication(Track.Source.Camera);
  const track = publication?.videoTrack ?? null;
  if (publication === undefined || track === null) return { track: null, state: "none" };
  return { track, state: publication.isMuted ? "off" : "on" };
}

export function createBackgroundEffects(
  host: SessionHost,
  hook: VideoProcessorHook | undefined,
  support: ConferencingSupport,
): BackgroundEffects {
  let requested: BackgroundEffect = NO_BACKGROUND_EFFECT;
  let status: BackgroundEffectStatus = "idle";
  let applied: Applied | null = null;
  let failedTrack: LocalVideoTrack | null = null;
  let busy: Promise<void> | null = null;
  let generation = 0;
  /** A prepare was asked for and the next idle reconcile should run it. */
  let prepareWanted = false;

  /** Runs one hook call; its outcome counts only if no reset happened meanwhile. */
  const run = (call: () => Promise<void>, onDone: (succeeded: boolean) => void): void => {
    const started = generation;
    busy = call()
      .then(
        () => {
          if (started === generation) onDone(true);
        },
        (error: unknown) => {
          host.report({ type: "background-effect-failed", errorName: errorName(error) });
          if (started === generation) onDone(false);
        },
      )
      .finally(() => {
        busy = null;
        host.scheduleRefresh();
      });
  };

  const reconcile = (room: Room | null): void => {
    if (busy !== null || hook === undefined) return;
    const camera = readCamera(room);
    // A replaced track took its processor with it; one the SDK dropped is gone too.
    const lost =
      applied !== null &&
      (applied.track !== camera.track || applied.track.getProcessor() === undefined);
    if (lost) applied = null;
    const plan = planBackgroundEffect({
      requested,
      camera: camera.state,
      appliedHere: applied !== null && sameBackgroundEffect(applied.effect, requested),
      processorHere: applied !== null,
      failedHere: failedTrack !== null && failedTrack === camera.track,
    });
    status = plan.status;
    const track = camera.track;
    if (track === null) {
      prepareWanted = false;
      return;
    }
    if (prepareWanted && plan.action === "none") {
      prepareWanted = false;
      // Only a live camera produces the frame segmentation needs; with the camera off the
      // first effect builds the programs when the camera comes back.
      if (camera.state === "on")
        run(
          () => hook.prepare(track),
          () => undefined,
        );
      return;
    }
    if (plan.action === "remove") {
      const removed = (): void => {
        applied = null;
      };
      run(() => hook.remove(track), removed);
    } else if (plan.action === "apply" && requested.kind !== "none") {
      const effect = requested;
      const done = (succeeded: boolean): void => {
        if (succeeded) applied = { track, effect };
        else failedTrack = track;
      };
      run(() => hook.apply(track, effect), done);
    }
  };

  /** Waits until no hook call runs and the latest request needs no further step. */
  const settle = async (): Promise<void> => {
    while (busy !== null) {
      await busy;
      host.refresh();
    }
  };

  return {
    state: () =>
      requested.kind === "none" && status === "idle"
        ? NO_BACKGROUND_EFFECT_STATE
        : { effect: requested, status },
    reconcile,
    reset: () => {
      generation += 1;
      requested = NO_BACKGROUND_EFFECT;
      status = "idle";
      applied = null;
      failedTrack = null;
      prepareWanted = false;
    },
    prepareBackgroundEffects: async () => {
      if (hook === undefined || support.backgroundEffects === "unsupported") return;
      if (host.joined() === null) return;
      prepareWanted = true;
      host.refresh();
      await settle();
      prepareWanted = false;
    },
    setBackgroundEffect: async (effect) => {
      const active = host.joined();
      if (active === null) return err(meetingErrors.connectionLost());
      const unsupported = hook === undefined || support.backgroundEffects === "unsupported";
      if (effect.kind !== "none" && unsupported) {
        return err(conferencingErrors.unsupported("backgroundEffects"));
      }
      requested = effect;
      failedTrack = null;
      host.refresh();
      await settle();
      if (!host.isCurrent(active)) return err(meetingErrors.connectionLost());
      const failed = status === "failed" && sameBackgroundEffect(requested, effect);
      return failed ? err(conferencingErrors.effectFailed()) : ok(undefined);
    },
  };
}
