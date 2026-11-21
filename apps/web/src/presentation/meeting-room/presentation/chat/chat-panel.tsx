// TJ-ARCH-MOB-001 compliant
// meet.html chat pane (WC-2, WC-3): "Meeting chat" with a lede, the messages of this
// session oldest first in a polite log, and the composer in the sheet's foot. Unlike the
// prototype's conversation rail, every message (to everyone and private) is in one log,
// each labelled with its audience, and the composer's "Send to" select picks the
// audience (scenario contract). Opening the pane moves focus to the message field; new
// messages keep the log scrolled to the end unless the reader has scrolled up.
// Scenario contract: km-chat-panel.
import type { ChatMessage, RemoteParticipant } from "@know-meet/domain";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { useEffect, useRef } from "react";
import { currentRecipientName } from "../../domain/chat-audience";
import { RoomSheetPane } from "../room-sheet/room-sheet-pane";
import { ChatComposer } from "./chat-composer";
import { CHAT_COPY } from "./chat-copy";
import { ChatMessageItem } from "./chat-message-item";
import type { ChatState } from "./use-chat";

/** How close to the end (px) still counts as "reading the latest". */
const STICK_TO_END_PX = 48;

interface ChatPanelProps {
  /** Chat is the sheet's current pane (open or closing). */
  readonly shown: boolean;
  /** The sheet is open on this pane: focus moves to the message field. */
  readonly active: boolean;
  readonly messages: readonly ChatMessage[];
  readonly remotes: readonly RemoteParticipant[];
  readonly chat: ChatState;
  readonly onClose: () => void;
}

function useStickToEnd(count: number) {
  const bodyRef = useRef<HTMLElement>(null);
  const atEnd = useRef(true);
  useEffect(() => {
    const body = bodyRef.current;
    if (body === null) return undefined;
    const onScroll = () => {
      atEnd.current = body.scrollHeight - body.scrollTop - body.clientHeight < STICK_TO_END_PX;
    };
    body.addEventListener("scroll", onScroll, { passive: true });
    return () => body.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const body = bodyRef.current;
    if (body !== null && atEnd.current && count > 0) body.scrollTop = body.scrollHeight;
  }, [count]);
  return bodyRef;
}

export function ChatPanel({ shown, active, messages, remotes, chat, onClose }: ChatPanelProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useStickToEnd(messages.length);
  useEffect(() => {
    if (active) inputRef.current?.focus({ preventScroll: true });
  }, [active]);

  return (
    <RoomSheetPane
      pane="chat"
      testId="km-chat-panel"
      shown={shown}
      title={CHAT_COPY.title}
      lede={
        <>
          <KmIcon name="users" className="size-4" />
          <span>{CHAT_COPY.lede}</span>
        </>
      }
      closeLabel={CHAT_COPY.close}
      onClose={onClose}
      bodyRef={bodyRef}
      bodyLabel={CHAT_COPY.logLabel}
      foot={<ChatComposer remotes={remotes} inputRef={inputRef} onSend={chat.send} />}
    >
      <div role="log" aria-label={CHAT_COPY.logLabel}>
        {messages.length === 0 ? (
          <div className="grid gap-1.5 py-s4 text-sm text-muted-foreground">
            <strong className="font-display text-base text-foreground">
              {CHAT_COPY.emptyHeading}
            </strong>
            <span>{CHAT_COPY.emptyText}</span>
          </div>
        ) : (
          <ol className="grid gap-s3">
            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                recipientName={
                  chat.recipientNames.get(message.id) ?? currentRecipientName(message, remotes)
                }
              />
            ))}
          </ol>
        )}
      </div>
    </RoomSheetPane>
  );
}
