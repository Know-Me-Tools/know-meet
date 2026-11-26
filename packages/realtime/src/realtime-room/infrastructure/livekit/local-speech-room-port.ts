import type { Room } from "livekit-client";
import {
  connectLocalSpeechConsent,
  type LocalSpeechConsentMessage,
} from "./local-speech-consent.ts";
import { type LocalSpeechRoomFacts, observeLocalSpeechRoom } from "./local-speech-room.ts";

type SpeechRoomState = LocalSpeechRoomFacts | null;
type Observer = (state: SpeechRoomState) => void;
type Receive = (sessionId: string, message: LocalSpeechConsentMessage) => void;

/**
 * Separate no-media-data room port. A capable peer can answer version probes
 * without opting into asset delivery or consenting to actual transcription.
 */
export function createLocalSpeechRoomPort(room: Room) {
  let closed = false;
  let roomState: SpeechRoomState = null;
  let targetedChecks = new Map<string, string>();
  let trackedEpoch: string | null = null;
  const capable = new Set<string>();
  const observers = new Set<Observer>();
  const receivers = new Set<Receive>();

  const wire = connectLocalSpeechConsent(room, (sender, message) => {
    if (closed || roomState === null) return;
    const participants = roomState.roster.participantSessionIds;
    if (!participants.includes(sender)) return;
    if (message.kind === "check-capability") {
      void wire.send([sender], { kind: "v1-capable", nonce: message.nonce });
      return;
    }
    if (message.kind === "v1-capable") {
      if (targetedChecks.get(sender) !== message.nonce) return;
      targetedChecks.delete(sender);
      if (!capable.has(sender)) {
        capable.add(sender);
        roster.refreshCapabilities();
      }
      return;
    }
    for (const receiver of receivers) receiver(sender, message);
  });

  const roster = observeLocalSpeechRoom({
    room,
    id: () => crypto.randomUUID(),
    supportsConsent: (sessionId) => capable.has(sessionId),
    change: (next) => {
      roomState = next;
      if (next !== null && trackedEpoch !== next.roster.roomEpoch) {
        trackedEpoch = next.roster.roomEpoch;
        targetedChecks = new Map();
        const hadCapabilities = capable.size > 0;
        capable.clear();
        if (hadCapabilities) {
          // Snapshot might reflect the previous connection's capability cache.
          roomState = null;
          for (const observer of observers) observer(null);
          roster.refreshCapabilities();
          return;
        }
      }
      if (next !== null) {
        for (const sid of capable) {
          if (!next.roster.participantSessionIds.includes(sid)) capable.delete(sid);
        }
        for (const sid of targetedChecks.keys()) {
          if (!next.roster.participantSessionIds.includes(sid)) targetedChecks.delete(sid);
        }
      }
      for (const observer of observers) observer(next);
    },
  });

  return {
    snapshot: () => roomState,
    peerLabel(sessionId: string): string {
      const participant = [...room.remoteParticipants.values()].find(
        (remote) => remote.sid === sessionId,
      );
      return participant?.name?.trim().slice(0, 80) || "A participant";
    },
    subscribe(observer: Observer) {
      observers.add(observer);
      observer(roomState);
      return () => {
        observers.delete(observer);
      };
    },
    onConsent(receiver: Receive) {
      receivers.add(receiver);
      return () => {
        receivers.delete(receiver);
      };
    },
    /**
     * Called only for an explicit local transcript request, never at meeting boot.
     * Successfully queued probes are not consent: each peer must also answer the
     * later exact requester purpose.
     */
    async checkCapability(): Promise<void> {
      const state = roomState;
      if (closed || state === null) return;
      const scoped = state.roster.participantSessionIds.filter(
        (sid) => sid !== state.localSessionId && !capable.has(sid),
      );
      await Promise.all(
        scoped.map(async (sid) => {
          const nonce = crypto.randomUUID();
          targetedChecks.set(sid, nonce);
          if (
            !(await wire.send([sid], { kind: "check-capability", nonce })) &&
            targetedChecks.get(sid) === nonce
          )
            targetedChecks.delete(sid);
        }),
      );
    },
    sendConsent: wire.send,
    close() {
      if (closed) return;
      closed = true;
      roster.close();
      wire.close();
      capable.clear();
      targetedChecks.clear();
      receivers.clear();
      observers.clear();
    },
  };
}

export type LiveKitLocalSpeechRoomPort = ReturnType<typeof createLocalSpeechRoomPort>;
