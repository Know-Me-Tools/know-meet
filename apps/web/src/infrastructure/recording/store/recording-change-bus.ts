// TJ-ARCH-MOB-001 compliant
import { parseRecordingRequestId } from "@know-meet/domain";
import type { RecordingChange } from "../library-types";
import { RECORDING_CHANNEL_NAME } from "../recording-constants";

export interface RecordingChangeBus {
  /** Tells this tab's listeners and other tabs. Never throws. */
  publish(change: RecordingChange): void;
  subscribe(listener: (change: RecordingChange) => void): () => void;
}

interface ChannelLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: unknown): void;
}

/** A change from another tab is outside data: rebuild it with the domain brand or drop it. */
export function parseRecordingChange(value: unknown): RecordingChange | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const id = parseRecordingRequestId(record["id"]);
  if (id === null) return null;
  if (record["kind"] === "changed") return { kind: "changed", id };
  if (record["kind"] === "deleted") return { kind: "deleted", id };
  return null;
}

function openBroadcastChannel(): ChannelLike | null {
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    return new BroadcastChannel(RECORDING_CHANNEL_NAME);
  } catch {
    return null;
  }
}

/** Same shape as the history change bus; the channel opens on first use. */
export function createRecordingChangeBus(
  openChannel: () => ChannelLike | null = openBroadcastChannel,
): RecordingChangeBus {
  const listeners = new Set<(change: RecordingChange) => void>();
  let channel: ChannelLike | null | undefined;

  const notify = (change: RecordingChange): void => {
    for (const listener of [...listeners]) {
      try {
        listener(change);
      } catch {
        // One failing listener must not stop the others or the write that caused this.
      }
    }
  };

  const ensureChannel = (): ChannelLike | null => {
    if (channel !== undefined) return channel;
    channel = openChannel();
    if (channel !== null) {
      channel.onmessage = (event) => {
        const change = parseRecordingChange(event.data);
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
