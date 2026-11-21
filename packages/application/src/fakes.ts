// In-memory port implementations for tests and offline development, exported as
// `@know-meet/application/fakes` and kept off the main entry.
export {
  createInMemoryHistoryRepository,
  type InMemoryHistoryRepository,
} from "./history/fakes/in-memory-history-repository.ts";
export {
  createFakeRealtimeRoom,
  type FakeAttachment,
  type FakeRealtimeRoom,
  type FakeSentConsent,
} from "./meeting/fakes/fake-realtime-room.ts";
export {
  createFakeTokenIssuer,
  type FakeTokenIssuer,
  type FakeTokenIssuerOptions,
} from "./meeting/fakes/fake-token-issuer.ts";
export {
  createFakeLocalRecorder,
  type FakeLocalRecorder,
} from "./recording/fakes/fake-local-recorder.ts";
