import {
  type BackgroundEffect,
  type ChatAudience,
  type ChatMessage,
  conferencingErrors,
  type DeviceId,
  type DeviceKind,
  err,
  type InvalidRequest,
  isSharingLocally,
  meetingErrors,
  parseChatText,
  type RecipientNotPresent,
  type Result,
} from "@know-meet/domain";
import type {
  AudioStartError,
  BackgroundEffectError,
  DeviceError,
  MessageSendError,
  RealtimeRoom,
  ScreenShareError,
} from "./ports.ts";

/** InvalidRequest: the text was empty or too long. RecipientNotPresent: they left. */
export type ChatSendError = InvalidRequest | RecipientNotPresent | MessageSendError;

/**
 * Screen share, chat, devices, audio playback and background effects, expressed only
 * against the RealtimeRoom port. Presentation calls these, not the port.
 */
export interface ConferencingUseCases {
  setScreenShare(enabled: boolean): Promise<Result<void, ScreenShareError>>;
  /** Starts sharing when this participant is not sharing, stops it when they are. */
  toggleScreenShare(): Promise<Result<void, ScreenShareError>>;
  /**
   * Checks the text and, for a private message, that the recipient is still in the room;
   * nothing is sent when either check fails. The audience is required (WC-2, WC-3).
   */
  sendChat(text: string, audience: ChatAudience): Promise<Result<ChatMessage, ChatSendError>>;
  selectDevice(kind: DeviceKind, id: DeviceId): Promise<Result<void, DeviceError>>;
  /** The "Enable audio" click (WC-12). Call only from the click handler. */
  enableAudio(): Promise<Result<void, AudioStartError>>;
  setBackgroundEffect(effect: BackgroundEffect): Promise<Result<void, BackgroundEffectError>>;
  /** Called when the Background section is shown; see `RealtimeRoom.prepareBackgroundEffects`. */
  prepareBackgroundEffects(): Promise<void>;
}

export function createConferencingUseCases(room: RealtimeRoom): ConferencingUseCases {
  return {
    setScreenShare: (enabled) => room.setScreenShareEnabled(enabled),
    toggleScreenShare: () =>
      room.setScreenShareEnabled(!isSharingLocally(room.getSnapshot().screenShares)),
    sendChat: (text, audience) => sendChat(room, text, audience),
    selectDevice: (kind, id) => room.selectDevice(kind, id),
    enableAudio: () => room.startAudio(),
    setBackgroundEffect: (effect) => room.setBackgroundEffect(effect),
    prepareBackgroundEffects: () => room.prepareBackgroundEffects(),
  };
}

async function sendChat(
  room: RealtimeRoom,
  text: string,
  audience: ChatAudience,
): Promise<Result<ChatMessage, ChatSendError>> {
  const parsed = parseChatText(text);
  if (parsed === null) return err(meetingErrors.invalidRequest());
  if (audience.kind === "private") {
    const present = room.getSnapshot().remotes.some((remote) => remote.identity === audience.to);
    if (!present) return err(conferencingErrors.recipientNotPresent());
  }
  return room.sendChat({ text: parsed, audience });
}
