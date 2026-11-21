import {
  type AudioPlayback,
  type ChatAudience,
  type ChatMessage,
  type ConferencingSupport,
  type ConnectionState,
  type ConsentEnvelope,
  type ConsentMessage,
  conferencingErrors,
  DEFAULT_DEVICE_CHOICE,
  err,
  hasDevice,
  isInRoom,
  type MediaDevice,
  meetingErrors,
  ok,
  type ParticipantIdentity,
  type RemoteParticipant,
  type TrackKind,
  toChatMessageId,
  withLocalTrackMuted,
} from "@know-meet/domain";
import type {
  ConnectError,
  ConnectOptions,
  MediaTarget,
  MessageSendError,
  RealtimeRoom,
  RoomCredentials,
  RoomSnapshot,
} from "../ports.ts";
import {
  connectedFor,
  disconnectedFrom,
  effectStateFor,
  FAKE_INITIAL,
  upsertRemote,
  withLocalShare,
} from "./fake-room-state.ts";

/** A media element bound to a target through `attachMedia` and not yet detached. */
export interface FakeAttachment {
  readonly target: MediaTarget;
  readonly element: HTMLMediaElement;
}

/** A consent message the fake was asked to send. */
export interface FakeSentConsent {
  readonly message: ConsentMessage;
  readonly to: ChatAudience;
}

/**
 * An in-memory RealtimeRoom for tests and offline development. It keeps the port's
 * snapshot contract and lets a test play the media server's and the browser's part.
 */
export interface FakeRealtimeRoom extends RealtimeRoom {
  /** Every credentials object passed to `connect`, in order. */
  connectCalls(): readonly RoomCredentials[];
  /** The options passed with each `connect`, in the same order; null when none were. */
  connectOptions(): readonly (ConnectOptions | null)[];
  /** Live media bindings. */
  attachments(): readonly FakeAttachment[];
  /** Makes the next `connect` fail with this error; the room returns to idle. */
  failNextConnect(error: ConnectError): void;
  /** Makes enabling or switching this device fail as if the browser refused it. */
  denyPermission(kind: TrackKind): void;
  /** Adds a remote participant, or replaces the one with the same identity in place. */
  setRemote(remote: RemoteParticipant): void;
  removeRemote(identity: ParticipantIdentity): void;
  /** Moves the connection, for example to `reconnecting` or a lost `disconnected`. */
  setConnection(connection: ConnectionState): void;
  /** Replaces what the browser can do. */
  setSupport(support: ConferencingSupport): void;
  /** Replaces the device list, as a browser device change would. */
  setAvailableDevices(devices: readonly MediaDevice[]): void;
  /** Makes the next screen-share start fail as if the picker was closed. */
  refuseNextScreenShare(): void;
  /** Ends the local share as the browser's own "Stop sharing" bar would. */
  endScreenShareFromBrowser(): void;
  /** Appends a received message to `chat`. */
  receiveChat(message: ChatMessage): void;
  /** Makes the next chat or consent send fail with this error. */
  failNextSend(error: MessageSendError): void;
  /** Consent messages sent, in order. */
  sentConsent(): readonly FakeSentConsent[];
  /** Hands a consent message to every `onConsentMessage` listener. */
  deliverConsent(envelope: ConsentEnvelope): void;
  /** Sets the playback flag, for example `blocked` as an autoplay policy would. */
  setAudioPlayback(playback: AudioPlayback): void;
  /** Makes `startAudio` keep failing until called with false. */
  keepAudioBlocked(blocked: boolean): void;
  /** Makes the next background effect fail to load. */
  failNextEffect(): void;
}

export function createFakeRealtimeRoom(): FakeRealtimeRoom {
  let snapshot = FAKE_INITIAL;
  let connectCalls: readonly RoomCredentials[] = [];
  let connectOptions: readonly (ConnectOptions | null)[] = [];
  let attachments: readonly FakeAttachment[] = [];
  let sentConsent: readonly FakeSentConsent[] = [];
  let nextConnectFailure: ConnectError | null = null;
  let nextSendFailure: MessageSendError | null = null;
  let denied: ReadonlySet<TrackKind> = new Set<TrackKind>();
  let refuseShare = false;
  let audioBlocked = false;
  let failEffect = false;
  let chatSequence = 0;
  const listeners = new Set<() => void>();
  const consentListeners = new Set<(envelope: ConsentEnvelope) => void>();

  const publish = (next: RoomSnapshot): void => {
    snapshot = next;
    for (const listener of listeners) listener();
  };

  /** Room actions need a joined room; sends need a live (not reconnecting) link. */
  const joinedLocal = () => (isInRoom(snapshot.connection) ? snapshot.local : null);
  const sendingLocal = () => (snapshot.connection.status === "connected" ? snapshot.local : null);

  const takeSendFailure = (): MessageSendError | null => {
    const failure = nextSendFailure;
    nextSendFailure = null;
    return failure;
  };

  const withoutLocalShare = (): RoomSnapshot => ({
    ...snapshot,
    screenShares: snapshot.screenShares.filter((share) => !share.isLocal),
  });

  return {
    connectCalls: () => connectCalls,
    connectOptions: () => connectOptions,
    attachments: () => attachments,
    sentConsent: () => sentConsent,
    failNextConnect: (error) => {
      nextConnectFailure = error;
    },
    failNextSend: (error) => {
      nextSendFailure = error;
    },
    denyPermission: (kind) => {
      denied = new Set([...denied, kind]);
    },
    refuseNextScreenShare: () => {
      refuseShare = true;
    },
    keepAudioBlocked: (blocked) => {
      audioBlocked = blocked;
    },
    failNextEffect: () => {
      failEffect = true;
    },
    setRemote: (remote) =>
      publish({ ...snapshot, remotes: upsertRemote(snapshot.remotes, remote) }),
    removeRemote: (identity) => {
      const remotes = snapshot.remotes.filter((entry) => entry.identity !== identity);
      const screenShares = snapshot.screenShares.filter((share) => share.identity !== identity);
      publish({ ...snapshot, remotes, screenShares });
    },
    setConnection: (connection) => publish({ ...snapshot, connection }),
    setSupport: (support) => publish({ ...snapshot, support }),
    setAvailableDevices: (available) =>
      publish({ ...snapshot, devices: { ...snapshot.devices, available } }),
    endScreenShareFromBrowser: () => publish(withoutLocalShare()),
    receiveChat: (message) => publish({ ...snapshot, chat: [...snapshot.chat, message] }),
    deliverConsent: (envelope) => {
      for (const listener of consentListeners) listener(envelope);
    },
    setAudioPlayback: (audioPlayback) => publish({ ...snapshot, audioPlayback }),

    connect: async (credentials, options) => {
      connectCalls = [...connectCalls, credentials];
      connectOptions = [...connectOptions, options ?? null];
      publish({ ...snapshot, connection: { status: "connecting" } });
      const failure = nextConnectFailure;
      nextConnectFailure = null;
      if (failure !== null) {
        publish({ ...disconnectedFrom(snapshot, "left"), connection: { status: "idle" } });
        return err(failure);
      }
      publish(connectedFor(snapshot, credentials, options?.devices ?? DEFAULT_DEVICE_CHOICE));
      return ok(undefined);
    },
    disconnect: async () => {
      publish(disconnectedFrom(snapshot, "left"));
    },
    setMediaEnabled: async (kind, enabled) => {
      const self = joinedLocal();
      if (self === null) return err(meetingErrors.connectionLost());
      if (enabled && denied.has(kind)) return err(meetingErrors.permissionDenied(kind));
      const next = withLocalTrackMuted(self, kind, !enabled);
      const backgroundEffect = effectStateFor(snapshot.backgroundEffect.effect, next);
      publish({ ...snapshot, local: next, backgroundEffect });
      return ok(undefined);
    },
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    attachMedia: (target, element) => {
      const attachment: FakeAttachment = { target, element };
      attachments = [...attachments, attachment];
      return () => {
        attachments = attachments.filter((entry) => entry !== attachment);
      };
    },

    setScreenShareEnabled: async (enabled) => {
      const self = joinedLocal();
      if (self === null) return err(meetingErrors.connectionLost());
      if (!enabled) {
        publish(withoutLocalShare());
        return ok(undefined);
      }
      if (snapshot.support.screenShare === "unsupported") {
        return err(conferencingErrors.unsupported("screenShare"));
      }
      if (refuseShare) {
        refuseShare = false;
        return err(conferencingErrors.shareNotStarted());
      }
      publish({ ...snapshot, screenShares: withLocalShare(snapshot.screenShares, self) });
      return ok(undefined);
    },
    sendChat: async (outgoing) => {
      const self = sendingLocal();
      if (self === null) return err(meetingErrors.connectionLost());
      const failure = takeSendFailure();
      if (failure !== null) return err(failure);
      chatSequence += 1;
      const message: ChatMessage = {
        id: toChatMessageId(`fake-chat-${chatSequence}`),
        direction: "sent",
        from: self.identity,
        fromName: self.displayName,
        audience: outgoing.audience,
        text: outgoing.text,
        sentAt: Date.now(),
      };
      publish({ ...snapshot, chat: [...snapshot.chat, message] });
      return ok(message);
    },
    refreshDevices: async () => {},
    selectDevice: async (kind, id) => {
      if (joinedLocal() === null) return err(meetingErrors.connectionLost());
      if (kind === "speaker" && snapshot.support.speakerSelection === "unsupported") {
        return err(conferencingErrors.unsupported("speakerSelection"));
      }
      if (!hasDevice(snapshot.devices.available, kind, id)) {
        return err(conferencingErrors.deviceNotFound(kind));
      }
      if (kind !== "speaker" && denied.has(kind)) return err(meetingErrors.permissionDenied(kind));
      const active = { ...snapshot.devices.active, [kind]: id };
      publish({ ...snapshot, devices: { ...snapshot.devices, active } });
      return ok(undefined);
    },
    startAudio: async () => {
      if (joinedLocal() === null) return err(meetingErrors.connectionLost());
      if (audioBlocked) return err(conferencingErrors.playbackBlocked());
      publish({ ...snapshot, audioPlayback: "allowed" });
      return ok(undefined);
    },
    setBackgroundEffect: async (effect) => {
      const self = joinedLocal();
      if (self === null) return err(meetingErrors.connectionLost());
      if (effect.kind !== "none" && snapshot.support.backgroundEffects === "unsupported") {
        return err(conferencingErrors.unsupported("backgroundEffects"));
      }
      if (effect.kind !== "none" && failEffect) {
        failEffect = false;
        publish({ ...snapshot, backgroundEffect: { effect, status: "failed" } });
        return err(conferencingErrors.effectFailed());
      }
      publish({ ...snapshot, backgroundEffect: effectStateFor(effect, self) });
      return ok(undefined);
    },
    prepareBackgroundEffects: async () => undefined,
    sendConsentMessage: async (message, to) => {
      if (sendingLocal() === null) return err(meetingErrors.connectionLost());
      const failure = takeSendFailure();
      if (failure !== null) return err(failure);
      sentConsent = [...sentConsent, { message, to }];
      return ok(undefined);
    },
    onConsentMessage: (listener) => {
      consentListeners.add(listener);
      return () => {
        consentListeners.delete(listener);
      };
    },
  };
}
