// TJ-ARCH-MOB-001 compliant
// Copy for the room chat (WC-2, WC-3). Audiences are always said out loud: who sees a
// message is stated before it is sent and on every message after. Errors give the
// cause, then the fix. Domain and application carry codes only.
import type { ChatSendError } from "@know-meet/application";
import { MAX_CHAT_TEXT_LENGTH } from "@know-meet/domain";

export const CHAT_COPY = {
  title: "Meeting chat",
  lede: "People who join later don’t see earlier messages.",
  close: "Close chat",
  logLabel: "Chat messages",
  emptyHeading: "No messages yet",
  emptyText: "Say hello, or share a link with the room.",
  audienceLabel: "Send to",
  scopeEveryone: "Everyone in the meeting sees this message.",
  inputEveryone: "Message everyone",
  send: "Send message",
  you: "You",
  empty: "Type a message first.",
  tooLong: `Messages can be up to ${MAX_CHAT_TEXT_LENGTH.toLocaleString("en")} characters. Shorten it, then send it again.`,
} as const;

export function scopePrivate(name: string): string {
  return `Only ${name} sees this message. It isn’t encrypted end to end.`;
}

export function inputPrivate(name: string): string {
  return `Message ${name} privately`;
}

export function recipientLeft(name: string): string {
  return `${name} left the meeting, so nothing was sent. Choose Everyone or someone still here.`;
}

/** The chat control's accessible name, with the unread count when there is one. */
export function chatControlName(unread: number): string {
  return unread === 0 ? "Chat" : `Chat, ${unread} unread`;
}

export function receivedAnnouncement(fromName: string, isPrivate: boolean): string {
  return isPrivate ? `Private message from ${fromName}` : `New message from ${fromName}`;
}

export function chatSendErrorText(
  error: ChatSendError,
  text: string,
  recipientName: string | null,
): string {
  switch (error.code) {
    case "invalid-request":
      return text.trim() === "" ? CHAT_COPY.empty : CHAT_COPY.tooLong;
    case "recipient-not-present":
      return recipientLeft(recipientName ?? "That person");
    case "send-failed":
      return "The message wasn’t sent. Check your connection, then send it again.";
    case "connection-lost":
      return "You’re not connected. Wait for the connection to come back, then send it again.";
  }
}
