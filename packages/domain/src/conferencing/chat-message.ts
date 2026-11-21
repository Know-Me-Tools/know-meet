import type { ParticipantIdentity } from "../meeting/participant.ts";

/**
 * Who a chat message is for. There is no default: every message names its audience, so a
 * private message can never be sent to everyone by omission (safety check, WC-3).
 *
 * - `everyone`: every participant in the room at the time it is sent.
 * - `private`: exactly one participant. The media server delivers it only to `to`; it is
 *   not encrypted and the server can read it (contract risk acceptance).
 */
export type ChatAudience =
  | { readonly kind: "everyone" }
  | { readonly kind: "private"; readonly to: ParticipantIdentity };

export const EVERYONE: ChatAudience = { kind: "everyone" };

export function privateTo(to: ParticipantIdentity): ChatAudience {
  return { kind: "private", to };
}

/** Opaque id of one message, unique within a room session. The adapter assigns it. */
export type ChatMessageId = string & { readonly __brand: "ChatMessageId" };

/** Ids are opaque transport values: this only marks a string as one. */
export function toChatMessageId(value: string): ChatMessageId {
  return value as ChatMessageId;
}

/** Message text after trimming: never empty, never longer than the limit. */
export type ChatText = string & { readonly __brand: "ChatText" };

/**
 * Longest accepted message, counted in code points. A product limit, not a transport one:
 * it keeps one message readable in the panel and bounds what a remote sender can push
 * into this client's memory and local history.
 */
export const MAX_CHAT_TEXT_LENGTH = 2000;

/** Trims the input. Returns null when the result is empty or longer than the limit. */
export function parseChatText(value: unknown): ChatText | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  const length = [...text].length;
  if (length === 0 || length > MAX_CHAT_TEXT_LENGTH) return null;
  return text as ChatText;
}

/**
 * What a participant asks to send. `audience` is required: the type rejects a message
 * built without one (conferencing-ports spec, case 2).
 */
export interface OutgoingChatMessage {
  readonly text: ChatText;
  readonly audience: ChatAudience;
}

/**
 * One message in this client's chat for the current room session, sent or received.
 *
 * For a received private message `audience.to` is always this client's own identity: the
 * media server delivered it here and nowhere else.
 */
export interface ChatMessage {
  readonly id: ChatMessageId;
  readonly direction: "sent" | "received";
  readonly from: ParticipantIdentity;
  /** The sender's display name when the message was sent or received. */
  readonly fromName: string;
  readonly audience: ChatAudience;
  readonly text: ChatText;
  /** Milliseconds since the Unix epoch, as the transport stamped it. */
  readonly sentAt: number;
}
