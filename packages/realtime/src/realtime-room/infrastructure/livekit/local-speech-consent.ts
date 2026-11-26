import { type RemoteParticipant, type Room, RoomEvent } from "livekit-client";

const TOPIC = "io.know-me.local-transcription.v1";
const PURPOSE = "speech-to-text-on-requesters-device";
const MAX_MESSAGE_BYTES = 640;
const TOKEN = /^[A-Za-z0-9_-]{8,96}$/;
const encode = new TextEncoder();
const decode = new TextDecoder("utf-8", { fatal: true });

export type LocalSpeechConsentMessage =
  | { readonly kind: "check-capability" | "v1-capable"; readonly nonce: string }
  | {
      readonly kind: "request";
      readonly requestId: string;
      readonly roomEpoch: string;
      readonly revision: number;
      readonly retention: "ephemeral" | "may-save-locally";
    }
  | {
      readonly kind: "response";
      readonly requestId: string;
      readonly roomEpoch: string;
      readonly revision: number;
      readonly response: "allow" | "decline" | "withdraw";
    }
  | {
      readonly kind: "status";
      readonly requestId: string;
      readonly roomEpoch: string;
      readonly revision: number;
      readonly status: "running" | "ended";
    };

function isToken(candidate: unknown): candidate is string {
  return typeof candidate === "string" && TOKEN.test(candidate);
}

function readMessage(payload: Uint8Array): LocalSpeechConsentMessage | null {
  if (payload.byteLength === 0 || payload.byteLength > MAX_MESSAGE_BYTES) return null;
  try {
    const value: unknown = JSON.parse(decode.decode(payload));
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const { purpose, kind, nonce, requestId, roomEpoch, revision, retention, status, response } =
      value as Record<string, unknown>;
    if (purpose !== PURPOSE) return null;
    if (kind === "check-capability" || kind === "v1-capable") {
      return isToken(nonce) ? { kind, nonce } : null;
    }
    if (
      !isToken(requestId) ||
      !isToken(roomEpoch) ||
      typeof revision !== "number" ||
      !Number.isSafeInteger(revision) ||
      revision < 0
    )
      return null;
    if (kind === "request" && (retention === "ephemeral" || retention === "may-save-locally")) {
      return {
        kind: "request",
        requestId,
        roomEpoch,
        revision,
        retention,
      };
    }
    if (kind === "status" && (status === "running" || status === "ended")) {
      return {
        kind: "status",
        requestId,
        roomEpoch,
        revision,
        status,
      };
    }
    if (
      kind === "response" &&
      (response === "allow" || response === "decline" || response === "withdraw")
    ) {
      return {
        kind: "response",
        requestId,
        roomEpoch,
        revision,
        response,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Dedicated authenticated-room signaling. No frames or text are valid payloads. */
export function connectLocalSpeechConsent(
  room: Room,
  onMessage: (senderSessionId: string, message: LocalSpeechConsentMessage) => void,
) {
  let closed = false;
  const receive = (
    payload: Uint8Array,
    participant?: RemoteParticipant,
    _kind?: unknown,
    topic?: string,
  ) => {
    if (
      closed ||
      topic !== TOPIC ||
      room.state !== "connected" ||
      participant === undefined ||
      participant.sid === "" ||
      room.remoteParticipants.get(participant.identity) !== participant
    )
      return;
    const message = readMessage(payload);
    if (message !== null) onMessage(participant.sid, message);
  };
  room.on(RoomEvent.DataReceived, receive);

  return {
    async send(
      targetSessionIds: readonly string[],
      message: LocalSpeechConsentMessage,
    ): Promise<boolean> {
      if (closed || room.state !== "connected" || targetSessionIds.length === 0) return false;
      const targets = [...new Set(targetSessionIds)];
      const identities = targets.flatMap((sid) => {
        const active = [...room.remoteParticipants.values()].find(
          (participant) => participant.sid === sid,
        );
        return active === undefined ? [] : [active.identity];
      });
      if (identities.length !== targets.length) return false;
      const parsed = readMessage(encode.encode(JSON.stringify({ ...message, purpose: PURPOSE })));
      if (parsed === null) return false;
      // Re-encode only the protocol allowlist; excess caller properties never leave the page.
      const payload = encode.encode(JSON.stringify({ ...parsed, purpose: PURPOSE }));
      try {
        await room.localParticipant.publishData(payload, {
          reliable: true,
          topic: TOPIC,
          destinationIdentities: identities,
        });
        // Reliable means best effort, not proof that a grant was delivered.
        return !closed && room.state === "connected";
      } catch {
        return false;
      }
    },
    close() {
      if (closed) return;
      closed = true;
      room.off(RoomEvent.DataReceived, receive);
    },
  };
}
