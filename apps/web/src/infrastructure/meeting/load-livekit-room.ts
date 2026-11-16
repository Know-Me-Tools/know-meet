// TJ-ARCH-MOB-001 compliant
import type { RealtimeRoom } from "@know-meet/application";

/**
 * Loads the LiveKit adapter package on demand. The dynamic import keeps `livekit-client`
 * out of the entry chunk; only `createLazyRealtimeRoom` calls this, on the first connect.
 */
export async function loadLiveKitRoom(): Promise<RealtimeRoom> {
  const { createLiveKitRealtimeRoom } = await import("@know-meet/realtime");
  return createLiveKitRealtimeRoom();
}
