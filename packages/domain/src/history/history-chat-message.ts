import type { ChatMessage, ChatMessageId, ChatText } from "../conferencing/chat-message.ts";
import type { ParticipantIdentity } from "../meeting/participant.ts";
import type { MeetingHistoryId } from "./meeting-history-id.ts";

/**
 * Who a kept message was for. A private message keeps the recipient's name as it was in
 * the meeting, because the history screen labels it after everyone has left.
 */
export type HistoryAudience =
  | { readonly kind: "everyone" }
  | {
      readonly kind: "private";
      readonly to: ParticipantIdentity;
      /** Empty when this device never saw the recipient's name. */
      readonly toName: string;
    };

/**
 * One chat message this device sent or received during a meeting session, kept locally
 * (decision D5: other people's messages included, never uploaded). Only messages received
 * while present exist here: there is no backfill from anyone (decision D3).
 */
export interface HistoryChatMessage {
  readonly meetingId: MeetingHistoryId;
  /** Unique within the session; the store keeps one row per (meetingId, id). */
  readonly id: ChatMessageId;
  readonly direction: "sent" | "received";
  readonly from: ParticipantIdentity;
  readonly fromName: string;
  readonly audience: HistoryAudience;
  /** Plain text. History never turns it into links (shape decision 3). */
  readonly text: ChatText;
  /** Milliseconds since the Unix epoch, as the transport stamped it. */
  readonly sentAt: number;
}

/**
 * The label the history screen shows for a message's audience, without the copy: the
 * presentation turns it into "Everyone", "Private to Marcus" or "Private from Marcus",
 * the same labels the room's chat panel uses (wc04).
 */
export type AudienceLabel =
  | { readonly kind: "everyone" }
  | { readonly kind: "private-to"; readonly name: string }
  | { readonly kind: "private-from"; readonly name: string };

/**
 * Turns a room chat message into the record history keeps. `nameOf` resolves the
 * recipient of a private message; a received private message is always addressed to this
 * device, so its recipient is this participant.
 */
export function toHistoryChatMessage(
  meetingId: MeetingHistoryId,
  message: ChatMessage,
  nameOf: (identity: ParticipantIdentity) => string | null,
): HistoryChatMessage {
  const audience: HistoryAudience =
    message.audience.kind === "everyone"
      ? { kind: "everyone" }
      : { kind: "private", to: message.audience.to, toName: nameOf(message.audience.to) ?? "" };
  return {
    meetingId,
    id: message.id,
    direction: message.direction,
    from: message.from,
    fromName: message.fromName,
    audience,
    text: message.text,
    sentAt: message.sentAt,
  };
}

export function audienceLabel(message: HistoryChatMessage): AudienceLabel {
  if (message.audience.kind === "everyone") return { kind: "everyone" };
  if (message.direction === "sent") return { kind: "private-to", name: message.audience.toName };
  return { kind: "private-from", name: message.fromName };
}
