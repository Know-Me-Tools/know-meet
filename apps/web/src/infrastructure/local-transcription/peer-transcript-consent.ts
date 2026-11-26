import type { TranscriptionRequest } from "@know-meet/domain";
import type { LiveKitLocalSpeechRoomPort } from "@know-meet/realtime";

export type PeerResponse = "allow" | "decline" | "withdraw";
export type PeerConsentState = "pending" | "allowed" | "running" | "withdrawing";
export interface PeerTranscriptRequest {
  readonly key: string;
  readonly fromSessionId: string;
  readonly displayName: string;
  readonly requestId: string;
  readonly roomEpoch: string;
  readonly revision: number;
  readonly retention: TranscriptionRequest["retention"];
  readonly state: PeerConsentState;
}

interface RequestIdentity {
  readonly requestId: string;
  readonly roomEpoch: string;
  readonly revision: number;
}

const MAX_OPEN = 32;
const MAX_REMEMBERED = 2_048;
const keyFor = (sender: string, event: RequestIdentity) =>
  JSON.stringify([sender, event.roomEpoch, event.requestId, event.revision]);

/** Peer consent does not own, prepare, or operate this browser's own model. */
export function createPeerTranscriptConsent(
  port: LiveKitLocalSpeechRoomPort,
  changed: (view: readonly PeerTranscriptRequest[]) => void,
) {
  const requests = new Map<string, PeerTranscriptRequest>();
  const resolved = new Set<string>();
  const sending = new Set<string>();
  const show = () => changed([...requests.values()]);
  function remember(key: string) {
    if (resolved.size < MAX_REMEMBERED) resolved.add(key);
  }
  const clear = () => {
    requests.clear();
    resolved.clear();
    sending.clear();
    show();
  };
  return {
    clear,
    prune(participants: readonly string[]) {
      for (const [key, item] of requests) {
        if (!participants.includes(item.fromSessionId)) {
          requests.delete(key);
          remember(key);
        }
      }
      show();
    },
    request(
      sender: string,
      event: RequestIdentity & {
        readonly retention: TranscriptionRequest["retention"];
      },
    ) {
      const key = keyFor(sender, event);
      if (
        requests.size >= MAX_OPEN ||
        resolved.size >= MAX_REMEMBERED ||
        requests.has(key) ||
        resolved.has(key)
      )
        return;
      // One outstanding prompt per sender; other participants' requests are independent.
      if ([...requests.values()].some((r) => r.fromSessionId === sender && r.state === "pending"))
        return;
      requests.set(key, {
        ...event,
        key,
        fromSessionId: sender,
        displayName: port.peerLabel(sender),
        state: "pending",
      });
      show();
    },
    status(sender: string, event: RequestIdentity & { readonly status: "running" | "ended" }) {
      const key = keyFor(sender, event);
      const item = requests.get(key);
      if (item === undefined) return;
      if (event.status === "ended") {
        requests.delete(key);
        remember(key);
      } else if (item.state === "allowed") {
        requests.set(key, { ...item, state: "running" });
      }
      show();
    },
    async answer(key: string, response: PeerResponse): Promise<boolean> {
      const item = requests.get(key);
      if (
        item === undefined ||
        sending.has(key) ||
        (response === "withdraw" ? item.state === "pending" : item.state !== "pending")
      )
        return false;
      sending.add(key);
      const optimistic: PeerTranscriptRequest = {
        ...item,
        state: response === "withdraw" ? "withdrawing" : "allowed",
      };
      if (response !== "decline") {
        requests.set(key, optimistic);
        show();
      }
      try {
        const queued = await port.sendConsent([item.fromSessionId], {
          kind: "response",
          requestId: item.requestId,
          roomEpoch: item.roomEpoch,
          revision: item.revision,
          response,
        });
        if (response === "decline" && queued && requests.get(key) === item) {
          requests.delete(key);
          remember(key);
        } else if (!queued && response !== "decline" && requests.get(key) === optimistic) {
          requests.set(key, item);
        }
        // A queued withdrawal is not proof of a stop; only an exact ended
        // status or leaving that room makes the old authority disappear here.
        show();
        return queued;
      } finally {
        sending.delete(key);
      }
    },
  };
}
