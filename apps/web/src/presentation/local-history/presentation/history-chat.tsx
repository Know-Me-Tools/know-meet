// TJ-ARCH-MOB-001 compliant
// Shape local-history.md §4, §6, LH-5: the chat this browser received, read-only,
// oldest first, in the room's `.msgs` / `.bubble` grammar (own messages on
// `ember-soft`, everyone else's on `card`). Every message states sender, time and
// audience as text ("Everyone", "Private to Marcus", "Private from Marcus").
// Stored text is plain: links are never made clickable (shape decision 3), and long
// words wrap. Scenario contract: km-history-message.
import type { HistoryChatMessage, MeetingSession } from "@know-meet/domain";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import { useId } from "react";
import { audienceText, formatTime, isoTime, senderName } from "../application/history-format";

function HistoryMessage({
  message,
  meeting,
}: {
  readonly message: HistoryChatMessage;
  readonly meeting: MeetingSession;
}) {
  const mine = message.direction === "sent";
  const isPrivate = message.audience.kind === "private";
  return (
    <li
      data-testid="km-history-message"
      data-audience={message.audience.kind}
      className={cn("grid min-w-0 gap-0.5", mine && "justify-items-end")}
    >
      <span className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-muted-foreground">
        <span>{senderName(message, meeting)}</span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          {isPrivate ? <KmIcon name="lock" className="size-3.5" /> : null}
          {audienceText(message, meeting)}
        </span>
        <span aria-hidden="true">·</span>
        <time dateTime={isoTime(message.sentAt)} className="font-mono text-11 font-medium">
          {formatTime(message.sentAt)}
        </time>
      </span>
      <span
        className={cn(
          "block max-w-full rounded-base px-3 py-2.5 text-foreground [overflow-wrap:anywhere] whitespace-pre-wrap",
          mine ? "bg-ember-soft" : "bg-card",
        )}
      >
        {message.text}
      </span>
    </li>
  );
}

export function HistoryChat({
  chat,
  meeting,
}: {
  readonly chat: readonly HistoryChatMessage[];
  readonly meeting: MeetingSession;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 content-start gap-s3">
      <h2 id={headingId} className="m-0 text-lg leading-heading font-semibold">
        Chat
      </h2>
      {chat.length === 0 ? (
        <p className="m-0 text-muted-foreground">No chat messages were sent in this meeting.</p>
      ) : (
        <ol className="m-0 grid min-w-0 list-none gap-s3 p-0">
          {chat.map((message) => (
            <HistoryMessage key={message.id} message={message} meeting={meeting} />
          ))}
        </ol>
      )}
    </section>
  );
}
