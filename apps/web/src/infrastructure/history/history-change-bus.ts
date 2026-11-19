// TJ-ARCH-MOB-001 compliant
import type { HistoryChange } from "@know-meet/application";
import { type ChatMessageId, parseMeetingHistoryId, toChatMessageId } from "@know-meet/domain";
import { HISTORY_CHANNEL_NAME } from "./history-constants";

/** Fans history changes out to this tab's listeners and to every other tab of the site. */
export interface HistoryChangeBus {
  /** Tells this tab's listeners and other tabs. Never throws. */
  publish(change: HistoryChange): void;
  /** Hears changes from this tab and from other tabs. Returns the unsubscribe function. */
  subscribe(listener: (change: HistoryChange) => void): () => void;
}

interface ChannelLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: unknown): void;
}

/** A change from another tab is outside data: rebuild it with the domain brands or drop it. */
export function parseHistoryChange(value: unknown): HistoryChange | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record["kind"] === "cleared") return { kind: "cleared" };
  const meetingId = parseMeetingHistoryId(record["meetingId"]);
  if (meetingId === null) return null;
  switch (record["kind"]) {
    case "meeting-changed":
      return { kind: "meeting-changed", meetingId };
    case "meeting-deleted":
      return { kind: "meeting-deleted", meetingId };
    case "chat-appended": {
      const ids = record["messageIds"];
      if (!Array.isArray(ids)) return null;
      const messageIds: ChatMessageId[] = [];
      for (const id of ids) if (typeof id === "string") messageIds.push(toChatMessageId(id));
      return { kind: "chat-appended", meetingId, messageIds };
    }
    default:
      return null;
  }
}

function openBroadcastChannel(): ChannelLike | null {
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    return new BroadcastChannel(HISTORY_CHANNEL_NAME);
  } catch {
    return null;
  }
}

export function createHistoryChangeBus(
  openChannel: () => ChannelLike | null = openBroadcastChannel,
): HistoryChangeBus {
  const listeners = new Set<(change: HistoryChange) => void>();
  let channel: ChannelLike | null | undefined;

  const notify = (change: HistoryChange): void => {
    for (const listener of [...listeners]) {
      try {
        listener(change);
      } catch {
        // One failing listener must not stop the others or the write that caused this.
      }
    }
  };

  /** Opened on first use, so a tab that never touches history never opens a channel. */
  const ensureChannel = (): ChannelLike | null => {
    if (channel !== undefined) return channel;
    channel = openChannel();
    if (channel !== null) {
      channel.onmessage = (event) => {
        const change = parseHistoryChange(event.data);
        if (change !== null) notify(change);
      };
    }
    return channel;
  };

  return {
    publish: (change) => {
      notify(change);
      try {
        ensureChannel()?.postMessage(change);
      } catch {
        // Another tab missing one notice only delays its refresh until its next read.
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      ensureChannel();
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
