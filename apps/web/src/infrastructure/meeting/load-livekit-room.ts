// TJ-ARCH-MOB-001 compliant
import type { RealtimeRoom } from "@know-meet/application";
import type { LiveKitRealtimeRoomOptions } from "@know-meet/realtime";
import { BACKGROUND_ASSET_PATHS } from "./background-asset-paths";

/**
 * Loads the LiveKit adapter package on demand. The dynamic import keeps `livekit-client`
 * out of the entry chunk; only `createLazyRealtimeRoom` calls this, on the first connect.
 *
 * The background processor hook (wc07) is built here, over the same-origin asset paths, so
 * the room reports `backgroundEffects` supported. `composeMeeting` passes the matching
 * `backgroundEffects: true` to the lazy room; the two must agree.
 */
export async function loadLiveKitRoom(
  options: Pick<LiveKitRealtimeRoomOptions, "onLocalSpeechRoom"> = {},
): Promise<RealtimeRoom> {
  const { createLiveKitRealtimeRoom, createBackgroundProcessorHook } = await import(
    "@know-meet/realtime"
  );
  return createLiveKitRealtimeRoom({
    ...options,
    videoProcessor: createBackgroundProcessorHook(BACKGROUND_ASSET_PATHS),
  });
}
