import type { MessageSendError } from "@know-meet/application";
import {
  type ChatAudience,
  type ChatMessage,
  type ConsentEnvelope,
  type ConsentMessage,
  conferencingErrors,
  decodeConsentMessage,
  encodeConsentMessage,
  err,
  meetingErrors,
  type OutgoingChatMessage,
  ok,
  type Result,
  toChatMessageId,
  toParticipantIdentity,
} from "@know-meet/domain";
import type { Room, TextStreamReader } from "livekit-client";
import type { MessageChannel } from "../../application/diagnostics.ts";
import {
  CHAT_TOPIC,
  CONSENT_TOPIC,
  MAX_CHAT_STREAM_BYTES,
  MAX_CONSENT_STREAM_BYTES,
  textSendOptions,
  toReceivedChat,
} from "../../domain/chat-codec.ts";
import { errorName } from "../../domain/error-mapping.ts";
import { displayNameFrom } from "../../domain/participant-mapping.ts";
import type { Session, SessionHost } from "./session-host.ts";

/** A sender that stalls mid-stream is given up on after this long. */
const READ_TIMEOUT_MS = 10_000;

/**
 * Chat and recording consent over LiveKit text streams (WC-2, WC-3, WC-8, WC-9): `sendText`
 * to send, `registerTextStreamHandler` to receive, one topic each. The deprecated
 * `sendChatMessage` API is not used.
 */
export interface TextStreams {
  /** This session's chat, oldest first; a new array on every append. */
  chat(): readonly ChatMessage[];
  /** Registers both topic handlers on a new SDK room, before it connects. */
  attach(session: Session): void;
  /** Empties the chat (a new connect, or leaving). */
  reset(): void;
  sendChat(message: OutgoingChatMessage): Promise<Result<ChatMessage, MessageSendError>>;
  sendConsentMessage(
    message: ConsentMessage,
    to: ChatAudience,
  ): Promise<Result<void, MessageSendError>>;
  onConsentMessage(listener: (envelope: ConsentEnvelope) => void): () => void;
}

/** Consent envelopes kept while no listener exists; older ones are dropped first. */
const MAX_HELD_CONSENT = 16;

export function createTextStreams(host: SessionHost): TextStreams {
  let chat: readonly ChatMessage[] = [];
  const consentListeners = new Set<(envelope: ConsentEnvelope) => void>();
  /**
   * WC-9: a late joiner's consent session starts only after its join resolves, but the
   * recorder sends "recording is running" as soon as the joiner appears. Envelopes that
   * arrive while nobody listens are held (bounded, this session only) and handed to the
   * first listener, so the prompt and indicator do not depend on which side was ready first.
   */
  let heldConsent: ConsentEnvelope[] = [];

  const append = (message: ChatMessage): void => {
    chat = [...chat, message];
    host.refresh();
  };

  /** The whole text, or null when the stream is too large, stalls or breaks. */
  const readText = async (
    reader: TextStreamReader,
    channel: MessageChannel,
    maxBytes: number,
  ): Promise<string | null> => {
    const size = reader.info.size;
    if (size !== undefined && size > maxBytes) {
      host.report({ type: "message-dropped", channel, reason: "too-large" });
      // Abort at once so the SDK stops buffering the rest of the stream.
      void reader.readAll({ signal: AbortSignal.abort() }).catch(() => undefined);
      return null;
    }
    try {
      return await reader.readAll({ signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
    } catch {
      host.report({ type: "message-dropped", channel, reason: "unreadable" });
      return null;
    }
  };

  const receiveChat = async (session: Session, reader: TextStreamReader, from: string) => {
    const text = await readText(reader, "chat", MAX_CHAT_STREAM_BYTES);
    if (text === null || !host.isCurrent(session)) return;
    const { room } = session;
    if (from === room.localParticipant.identity) return;
    const message = toReceivedChat({
      streamId: reader.info.id,
      timestamp: reader.info.timestamp,
      attributes: reader.info.attributes,
      from,
      fromName: displayNameFrom(from, room.remoteParticipants.get(from)?.name),
      text,
      localIdentity: toParticipantIdentity(room.localParticipant.identity),
    });
    if (message === null) {
      host.report({ type: "message-dropped", channel: "chat", reason: "malformed" });
      return;
    }
    append(message);
  };

  const receiveConsent = async (session: Session, reader: TextStreamReader, from: string) => {
    const text = await readText(reader, "consent", MAX_CONSENT_STREAM_BYTES);
    if (text === null || !host.isCurrent(session) || from === "") return;
    const message = decodeConsentMessage(text);
    if (message === null) {
      host.report({ type: "message-dropped", channel: "consent", reason: "malformed" });
      return;
    }
    // The sender is the identity the media server reported, never a payload field.
    const envelope: ConsentEnvelope = { from: toParticipantIdentity(from), message };
    if (consentListeners.size === 0) {
      heldConsent = [...heldConsent, envelope].slice(-MAX_HELD_CONSENT);
      return;
    }
    for (const listener of [...consentListeners]) listener(envelope);
  };

  /** Sends one text stream; a failure while still connected is the server's refusal. */
  const send = async (
    session: Session,
    channel: MessageChannel,
    text: string,
    topic: string,
    audience: ChatAudience,
  ): Promise<Result<{ readonly id: string; readonly timestamp: number }, MessageSendError>> => {
    try {
      const options = textSendOptions(topic, audience);
      const info = await session.room.localParticipant.sendText(text, options);
      return ok({ id: info.id, timestamp: info.timestamp });
    } catch (error) {
      host.report({ type: "message-send-failed", channel, errorName: errorName(error) });
      const stillLive = host.live() !== null && host.isCurrent(session);
      return err(stillLive ? conferencingErrors.sendFailed() : meetingErrors.connectionLost());
    }
  };

  return {
    chat: () => chat,
    attach: (session) => {
      const room: Room = session.room;
      room.registerTextStreamHandler(CHAT_TOPIC, (reader, sender) => {
        void receiveChat(session, reader, sender.identity);
      });
      room.registerTextStreamHandler(CONSENT_TOPIC, (reader, sender) => {
        void receiveConsent(session, reader, sender.identity);
      });
    },
    reset: () => {
      chat = [];
      heldConsent = [];
    },
    sendChat: async (outgoing) => {
      const session = host.live();
      if (session === null) return err(meetingErrors.connectionLost());
      const sent = await send(session, "chat", outgoing.text, CHAT_TOPIC, outgoing.audience);
      if (!sent.ok) return sent;
      if (!host.isCurrent(session)) return err(meetingErrors.connectionLost());
      const local = session.room.localParticipant;
      const message: ChatMessage = {
        id: toChatMessageId(sent.value.id),
        direction: "sent",
        from: toParticipantIdentity(local.identity),
        fromName: displayNameFrom(local.identity, local.name),
        audience: outgoing.audience,
        text: outgoing.text,
        sentAt: sent.value.timestamp,
      };
      append(message);
      return ok(message);
    },
    sendConsentMessage: async (message, to) => {
      const session = host.live();
      if (session === null) return err(meetingErrors.connectionLost());
      const sent = await send(session, "consent", encodeConsentMessage(message), CONSENT_TOPIC, to);
      return sent.ok ? ok(undefined) : sent;
    },
    onConsentMessage: (listener) => {
      consentListeners.add(listener);
      const held = heldConsent;
      heldConsent = [];
      for (const envelope of held) listener(envelope);
      return () => {
        consentListeners.delete(listener);
      };
    },
  };
}
