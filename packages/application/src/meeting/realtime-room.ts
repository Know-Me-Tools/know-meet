import type {
  ActiveDevices,
  AudioPlayback,
  BackgroundEffect,
  BackgroundEffectState,
  ChatAudience,
  ChatMessage,
  ConferencingSupport,
  ConnectionLost,
  ConnectionState,
  ConsentEnvelope,
  ConsentMessage,
  DeviceChoice,
  DeviceId,
  DeviceKind,
  DeviceNotFound,
  EffectFailed,
  Forbidden,
  LocalParticipant,
  MediaDevice,
  MediaSource,
  OutgoingChatMessage,
  ParticipantIdentity,
  PermissionDenied,
  PlaybackBlocked,
  RemoteParticipant,
  Result,
  ScreenShare,
  SendFailed,
  ShareNotStarted,
  TrackKind,
  Unsupported,
} from "@know-meet/domain";
import type { RoomCredentials } from "./ports.ts";

/** The devices the browser reports and the ones in use. */
export interface DeviceState {
  /**
   * Every microphone, camera and speaker, in browser order. Kept current in every
   * connection state, including before `connect`, so the lobby can list devices (WC-5).
   * Labels are empty until the site has permission for that kind.
   */
  readonly available: readonly MediaDevice[];
  /** What each kind uses now; `null` means the system default. */
  readonly active: ActiveDevices;
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
  /** Screens being shared now: the local share first, then remote ones in join order. */
  readonly screenShares: readonly ScreenShare[];
  /**
   * This session's chat, sent and received, oldest first. Append-only while connected, so a
   * consumer can read only the entries past the length it last saw; empty again on the next
   * `connect`. A sent message appears once the server accepted it.
   */
  readonly chat: readonly ChatMessage[];
  readonly devices: DeviceState;
  /** `blocked` while the browser refuses to play remote audio (WC-12). */
  readonly audioPlayback: AudioPlayback;
  /** The requested camera background and how far it has got (WC-4). */
  readonly backgroundEffect: BackgroundEffectState;
  /** What this browser can do. Fixed for the page's lifetime. */
  readonly support: ConferencingSupport;
}

/** Which participant's which medium a media element should play. */
export interface MediaTarget {
  readonly identity: ParticipantIdentity;
  readonly kind: MediaSource;
}

/** Applied while connecting, before any device is opened. */
export interface ConnectOptions {
  /**
   * The lobby's choice (WC-5). A chosen device that is gone by then falls back to the system
   * default; that is not an error.
   */
  readonly devices: DeviceChoice;
}

/** Forbidden: the media server rejected the token. ConnectionLost: it could not be reached. */
export type ConnectError = Forbidden | ConnectionLost;

/** PermissionDenied: the browser refused the device. ConnectionLost: not in the room. */
export type MediaError = PermissionDenied | ConnectionLost;

export type ScreenShareError = ShareNotStarted | Unsupported | ConnectionLost;

/** SendFailed: connected, but the server did not take the message. */
export type MessageSendError = SendFailed | ConnectionLost;

export type DeviceError = DeviceNotFound | Unsupported | PermissionDenied | ConnectionLost;

export type AudioStartError = PlaybackBlocked | ConnectionLost;

export type BackgroundEffectError = Unsupported | EffectFailed | ConnectionLost;

/**
 * A realtime meeting room. The LiveKit adapter (`packages/realtime`) implements it; nothing
 * here names a LiveKit type. See docs/adr/0001-realtime-room-port.md and
 * docs/adr/0002-conferencing-ports-and-recording-consent.md.
 *
 * - After `connect` succeeds the local microphone and camera are off until enabled.
 * - Every state change (connection, participants, mute, subscription, shares, chat,
 *   devices, playback, effect) produces a new snapshot and then notifies every listener.
 * - `attachMedia` binds an element to a target for as long as the binding lives: the
 *   adapter attaches the track when it is subscribed (or published, for local video),
 *   re-attaches when it is replaced, clears the element when it goes away, and the returned
 *   function detaches. Attaching the local microphone or local screen-share audio does
 *   nothing, so a participant never hears themselves. Audio elements play through the
 *   active speaker.
 * - Methods that act in the room return ConnectionLost when not connected (or
 *   reconnecting, for sends), and never throw for an expected failure.
 */
export interface RealtimeRoom {
  connect(
    credentials: RoomCredentials,
    options?: ConnectOptions,
  ): Promise<Result<void, ConnectError>>;
  disconnect(): Promise<void>;
  setMediaEnabled(kind: TrackKind, enabled: boolean): Promise<Result<void, MediaError>>;
  getSnapshot(): RoomSnapshot;
  subscribe(listener: () => void): () => void;
  attachMedia(target: MediaTarget, element: HTMLMediaElement): () => void;

  /**
   * Starts or stops sharing a screen, window or tab, chosen in the browser's own picker
   * with no surface restriction. Sharing that the browser ends (its "Stop sharing" bar)
   * leaves `screenShares` like a stop does. Unsupported where `support.screenShare` is.
   */
  setScreenShareEnabled(enabled: boolean): Promise<Result<void, ScreenShareError>>;

  /**
   * Sends one chat message to its audience and returns it as appended to `chat`. A private
   * message reaches only `audience.to`; the receiver sees it as private to itself.
   * Delivery is not acknowledged: success means the server accepted it.
   */
  sendChat(message: OutgoingChatMessage): Promise<Result<ChatMessage, MessageSendError>>;

  /**
   * Re-reads the device list into `devices.available`. Never opens a permission prompt;
   * the adapter also refreshes by itself when the browser reports a device change.
   */
  refreshDevices(): Promise<void>;

  /**
   * Switches one kind to a listed device; the published track continues on it and the
   * background effect, if any, carries over. `speaker` is Unsupported where
   * `support.speakerSelection` is (no `setSinkId`), and is never attempted there.
   */
  selectDevice(kind: DeviceKind, id: DeviceId): Promise<Result<void, DeviceError>>;

  /**
   * Asks the browser to play remote audio. Call it only from a click or key handler, the
   * "Enable audio" button; PlaybackBlocked means the browser still refused.
   */
  startAudio(): Promise<Result<void, AudioStartError>>;

  /**
   * Requests a camera background. The request holds for the session: while the camera is
   * off it is `pending`, and it is reapplied when the camera track is replaced (device
   * switch, camera toggled back on). `none` removes the processor. EffectFailed leaves the
   * camera unprocessed and the state `failed`.
   */
  setBackgroundEffect(effect: BackgroundEffect): Promise<Result<void, BackgroundEffectError>>;

  /**
   * Sends one recording-consent message on the room's reserved consent topic, which is
   * never the chat topic. Only the consent use cases call it.
   */
  sendConsentMessage(
    message: ConsentMessage,
    to: ChatAudience,
  ): Promise<Result<void, MessageSendError>>;

  /**
   * Delivers every well-formed consent message received, with the sender the transport
   * reported. Malformed messages are dropped. Returns the unsubscribe function.
   */
  onConsentMessage(listener: (envelope: ConsentEnvelope) => void): () => void;
}
