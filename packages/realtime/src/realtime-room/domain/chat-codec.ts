import {
  type ChatAudience,
  type ChatMessage,
  EVERYONE,
  MAX_CHAT_TEXT_LENGTH,
  type ParticipantIdentity,
  parseChatText,
  privateTo,
  toChatMessageId,
  toParticipantIdentity,
} from "@know-meet/domain";

/**
 * Topic of chat text streams. `lk.chat` is the LiveKit docs convention, not an SDK constant;
 * every Know Meet client (web and Flutter) uses this one value.
 */
export const CHAT_TOPIC = "lk.chat";

/**
 * Reserved topic of recording-consent messages. Never the chat topic, so a consent message is
 * never shown as chat and a chat message never reaches the consent rules.
 */
export const CONSENT_TOPIC = "know-meet.recording-consent";

/**
 * Stream attribute that says who a message was addressed to. The receiver's stream info has
 * no destination list, so the sender states it: `private` or `everyone`.
 */
export const AUDIENCE_ATTRIBUTE = "audience";
const PRIVATE = "private";
const PUBLIC = "everyone";

/** Largest chat stream read: the text limit at four UTF-8 bytes per code point. */
export const MAX_CHAT_STREAM_BYTES = MAX_CHAT_TEXT_LENGTH * 4;

/** Largest consent stream read; the codec itself accepts at most 1024 characters. */
export const MAX_CONSENT_STREAM_BYTES = 4096;

/** The fields the SDK's `sendText` options need. A fresh object for every send. */
export interface TextSendOptions {
  topic: string;
  destinationIdentities?: string[];
  attributes: Record<string, string>;
}

/**
 * Send options for one audience. Privacy boundary: a private message always carries exactly
 * one destination identity, so the media server delivers it to that participant only; there
 * is no branch that sends a private message without it.
 */
export function textSendOptions(topic: string, audience: ChatAudience): TextSendOptions {
  if (audience.kind === "private") {
    return {
      topic,
      destinationIdentities: [audience.to],
      attributes: { [AUDIENCE_ATTRIBUTE]: PRIVATE },
    };
  }
  return { topic, attributes: { [AUDIENCE_ATTRIBUTE]: PUBLIC } };
}

/** A received message marked private is private to this client; anything else is public. */
export function receivedAudience(
  attributes: Readonly<Record<string, string>> | undefined,
  localIdentity: ParticipantIdentity,
): ChatAudience {
  return attributes?.[AUDIENCE_ATTRIBUTE] === PRIVATE ? privateTo(localIdentity) : EVERYONE;
}

/** One received text stream on the chat topic, as read from the SDK. */
export interface ReceivedChatFacts {
  readonly streamId: string;
  readonly timestamp: number;
  readonly attributes: Readonly<Record<string, string>> | undefined;
  readonly from: string;
  readonly fromName: string;
  readonly text: string;
  readonly localIdentity: ParticipantIdentity;
}

/** The chat entry for a received stream, or null when its text is empty or too long. */
export function toReceivedChat(facts: ReceivedChatFacts): ChatMessage | null {
  const text = parseChatText(facts.text);
  if (text === null || facts.from === "") return null;
  return {
    id: toChatMessageId(facts.streamId),
    direction: "received",
    from: toParticipantIdentity(facts.from),
    fromName: facts.fromName,
    audience: receivedAudience(facts.attributes, facts.localIdentity),
    text,
    sentAt: facts.timestamp,
  };
}
