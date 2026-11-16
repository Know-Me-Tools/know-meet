// In-memory port implementations for tests and offline development, exported as
// `@know-meet/application/fakes` and kept off the main entry.
export {
  createFakeRealtimeRoom,
  type FakeAttachment,
  type FakeRealtimeRoom,
} from "./meeting/fakes/fake-realtime-room.ts";
export {
  createFakeTokenIssuer,
  type FakeTokenIssuer,
  type FakeTokenIssuerOptions,
} from "./meeting/fakes/fake-token-issuer.ts";
