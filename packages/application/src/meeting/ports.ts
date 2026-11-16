import type {
  ConnectionLost,
  ConnectionState,
  DisplayName,
  Forbidden,
  InvalidRequest,
  LocalParticipant,
  MeetingNotFound,
  ParticipantIdentity,
  PermissionDenied,
  RateLimited,
  RemoteParticipant,
  Result,
  RoomCode,
  TrackKind,
} from "@know-meet/domain";

/** What the token service hands one guest for one room. */
export interface RoomCredentials {
  /** Public media server URL (`wss://`). */
  readonly url: string;
  /** Short-lived access token. Pass it to `RealtimeRoom.connect` only; never store or log it. */
  readonly token: string;
  readonly identity: ParticipantIdentity;
  /** Equals the requested code. */
  readonly room: RoomCode;
  /** Seconds until the token expires. */
  readonly expiresIn: number;
}

export interface TokenRequest {
  readonly code: RoomCode;
  readonly displayName: DisplayName;
}

export type CreateMeetingError = RateLimited | Forbidden | ConnectionLost;

export type TokenRequestError =
  | MeetingNotFound
  | RateLimited
  | Forbidden
  | InvalidRequest
  | ConnectionLost;

/**
 * Issues room codes and access tokens. The web adapter calls the token service
 * (`POST /api/meetings`, `POST /api/token`) and maps its answers: 404 to meeting-not-found,
 * 429 to rate-limited (with `Retry-After`), 403 to forbidden, 400 to invalid-request, and a
 * network failure or 5xx to connection-lost. It never throws for those cases.
 */
export interface TokenIssuer {
  createMeeting(signal?: AbortSignal): Promise<Result<RoomCode, CreateMeetingError>>;
  requestToken(
    request: TokenRequest,
    signal?: AbortSignal,
  ): Promise<Result<RoomCredentials, TokenRequestError>>;
}

/**
 * One immutable picture of the room. `getSnapshot` returns the same object until something
 * changes, then a new one (the `useSyncExternalStore` contract).
 */
export interface RoomSnapshot {
  readonly connection: ConnectionState;
  /** Null until connected and again after disconnecting. */
  readonly local: LocalParticipant | null;
  /** Remote participants in the order they joined. */
  readonly remotes: readonly RemoteParticipant[];
}

/** Which participant's which medium a media element should play. */
export interface MediaTarget {
  readonly identity: ParticipantIdentity;
  readonly kind: TrackKind;
}

/** Forbidden: the media server rejected the token. ConnectionLost: it could not be reached. */
export type ConnectError = Forbidden | ConnectionLost;

/** PermissionDenied: the browser refused the device. ConnectionLost: not in the room. */
export type MediaError = PermissionDenied | ConnectionLost;

/**
 * A realtime meeting room. The LiveKit adapter (`packages/realtime`) implements it; nothing
 * here names a LiveKit type. See docs/adr/0001-realtime-room-port.md.
 *
 * - After `connect` succeeds the local microphone and camera are off until enabled.
 * - Every state change (connection, participants, mute, subscription) produces a new
 *   snapshot and then notifies every listener.
 * - `attachMedia` binds an element to a target for as long as the binding lives: the
 *   adapter attaches the track when it is subscribed (or published, for the local camera),
 *   re-attaches when it is replaced, clears the element when it goes away, and the returned
 *   function detaches. Attaching the local microphone does nothing, so a guest never hears
 *   themselves.
 */
export interface RealtimeRoom {
  connect(credentials: RoomCredentials): Promise<Result<void, ConnectError>>;
  disconnect(): Promise<void>;
  setMediaEnabled(kind: TrackKind, enabled: boolean): Promise<Result<void, MediaError>>;
  getSnapshot(): RoomSnapshot;
  subscribe(listener: () => void): () => void;
  attachMedia(target: MediaTarget, element: HTMLMediaElement): () => void;
}
