// TJ-ARCH-MOB-001 compliant
// Room chat state that outlives the panel (WC-2, WC-3): the unread count on the Chat
// control, the names private messages were sent to (kept at send time, because the
// recipient may leave), and the send action. Messages themselves are the room
// snapshot's append-only `chat`; nothing is copied out of it. While the panel is
// closed, a received message is announced politely, since the hidden log cannot be.
import type { ChatSendError, ConferencingUseCases } from "@know-meet/application";
import type { ChatMessage, ChatMessageId, Result } from "@know-meet/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Announce } from "../../../guest-meeting/live-status";
import { type AudienceChoice, toChatAudience } from "../../domain/chat-audience";
import { receivedAnnouncement } from "./chat-copy";

export interface ChatState {
  readonly unread: number;
  readonly recipientNames: ReadonlyMap<ChatMessageId, string>;
  readonly send: (
    text: string,
    choice: AudienceChoice,
  ) => Promise<Result<ChatMessage, ChatSendError>>;
  /** Everything received so far counts as read (called when the panel opens or closes). */
  readonly markSeen: () => void;
}

function receivedSince(chat: readonly ChatMessage[], seenUpTo: number): number {
  // `chat` empties on the next connect; a shorter list means a new session.
  const from = seenUpTo > chat.length ? 0 : seenUpTo;
  let count = 0;
  for (let index = from; index < chat.length; index += 1) {
    if (chat[index]?.direction === "received") count += 1;
  }
  return count;
}

export function useChat(
  conferencing: ConferencingUseCases,
  chat: readonly ChatMessage[],
  open: boolean,
  announce: Announce,
): ChatState {
  const [seenUpTo, setSeenUpTo] = useState(0);
  const [recipientNames, setRecipientNames] = useState<ReadonlyMap<ChatMessageId, string>>(
    () => new Map(),
  );
  const announcedUpTo = useRef(chat.length);

  useEffect(() => {
    const from = announcedUpTo.current > chat.length ? 0 : announcedUpTo.current;
    announcedUpTo.current = chat.length;
    if (open) return;
    for (let index = chat.length - 1; index >= from; index -= 1) {
      const message = chat[index];
      if (message?.direction === "received") {
        announce(receivedAnnouncement(message.fromName, message.audience.kind === "private"));
        return;
      }
    }
  }, [chat, open, announce]);

  const markSeen = useCallback(() => setSeenUpTo(chat.length), [chat.length]);

  const send = useCallback(
    async (text: string, choice: AudienceChoice) => {
      const result = await conferencing.sendChat(text, toChatAudience(choice));
      if (result.ok && choice.kind === "private") {
        const { id } = result.value;
        setRecipientNames((previous) => new Map(previous).set(id, choice.name));
      }
      return result;
    },
    [conferencing],
  );

  return {
    unread: open ? 0 : receivedSince(chat, seenUpTo),
    recipientNames,
    send,
    markSeen,
  };
}
