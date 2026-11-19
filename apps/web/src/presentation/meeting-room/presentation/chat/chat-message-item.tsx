// TJ-ARCH-MOB-001 compliant
// meet.html `.chat-msg` (WC-2, WC-3): the sender ("You" for your own), the audience
// and the time on one line, the text below. Your messages sit at the end on an
// `ember-soft` bubble; private messages from others on a `card` bubble; messages to
// everyone from others are plain text. The audience is text on every message
// ("Everyone", "Private to <name>", "Private to you"), with a lock glyph for private
// ones, so it is never carried by colour or position alone. Scenario contract:
// km-chat-message (data-audience), km-chat-message-text (exactly the text),
// km-chat-message-audience.
import type { ChatMessage } from "@know-meet/domain";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import { messageAudienceLabel } from "../../domain/chat-audience";
import { CHAT_COPY } from "./chat-copy";

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

interface ChatMessageItemProps {
  readonly message: ChatMessage;
  /** For a private message this client sent: the name it was sent to. */
  readonly recipientName: string | null;
}

export function ChatMessageItem({ message, recipientName }: ChatMessageItemProps) {
  const mine = message.direction === "sent";
  const isPrivate = message.audience.kind === "private";
  const sentAt = new Date(message.sentAt);
  return (
    <li
      data-testid="km-chat-message"
      data-audience={message.audience.kind}
      className={cn("grid gap-0.5", mine && "justify-items-end")}
    >
      <span className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-muted-foreground">
        <span>{mine ? CHAT_COPY.you : message.fromName}</span>
        <span aria-hidden="true">·</span>
        <span data-testid="km-chat-message-audience" className="inline-flex items-center gap-1">
          {isPrivate ? <KmIcon name="lock" className="size-3.5" /> : null}
          {messageAudienceLabel(message, recipientName)}
        </span>
        <time dateTime={sentAt.toISOString()} className="font-mono text-11 font-medium">
          {timeFormat.format(sentAt)}
        </time>
      </span>
      <span
        data-testid="km-chat-message-text"
        className={cn(
          "block max-w-full text-foreground [overflow-wrap:anywhere] whitespace-pre-wrap",
          mine && "rounded-base bg-ember-soft px-3 py-2.5",
          !mine && isPrivate && "rounded-base bg-card px-3 py-2.5",
        )}
      >
        {message.text}
      </span>
    </li>
  );
}
