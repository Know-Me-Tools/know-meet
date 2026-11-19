/**
 * `@know-meet/realtime/browser`: what the page can read before the media SDK loads. Nothing
 * here imports `livekit-client`, so the app's entry chunk may import it statically.
 */
export {
  detectConferencingSupport,
  type SupportOptions,
} from "./conferencing-support.ts";
export { type DeviceCatalog, getDeviceCatalog } from "./device-catalog.ts";
