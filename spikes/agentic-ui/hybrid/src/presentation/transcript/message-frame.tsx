/** One transcript message (shadcn AI Elements "Message" pattern on Know Meet tokens). */
import type { ReactNode } from "react";
import type { MessageStatus } from "../../domain/transcript/model.ts";

export interface MessageFrameProps {
  readonly messageId: string;
  readonly role: "user" | "assistant";
  readonly status: MessageStatus;
  readonly children: ReactNode;
}

const STATUS_NOTE: Partial<Record<MessageStatus, string>> = {
  cancelled: "Stopped before the answer finished.",
  error: "The answer was interrupted by an error.",
};

export function MessageFrame({ messageId, role, status, children }: MessageFrameProps) {
  const note = STATUS_NOTE[status];
  if (role === "user") {
    return (
      <article data-testid="km-message" data-message-id={messageId} data-role="user" data-status={status} aria-label="You" className="ml-auto max-w-[80%] rounded-lg rounded-br-4 bg-card px-s4 py-s3 text-15 leading-bubble text-fg">
        {children}
      </article>
    );
  }
  return (
    <article data-testid="km-message" data-message-id={messageId} data-role="assistant" data-status={status} aria-label="Assistant" className="max-w-full text-15 leading-bubble text-fg">
      <div className="km-prose min-w-0">{children}</div>
      {note === undefined ? null : <p className="mt-s2 text-xs text-fg-sub">{note}</p>}
    </article>
  );
}
