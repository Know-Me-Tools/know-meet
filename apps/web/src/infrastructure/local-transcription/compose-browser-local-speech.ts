import {
  LocalTranscriptionFence,
  type TranscriptionLease,
  type TranscriptionRequest,
} from "@know-meet/domain";
import type { LiveKitLocalSpeechRoomPort } from "@know-meet/realtime";
import { bindLocalTranscriptionTrack } from "./browser-capture";
import { createPeerTranscriptConsent, type PeerTranscriptRequest } from "./peer-transcript-consent";
import {
  createLocalSpeechIngress,
  LOCAL_SPEECH_RATE,
  type LocalSpeechEndpoint,
  type LocalSpeechSink,
} from "./speech-ingress";
import { openLocalSpeechWorker } from "./speech-worker-client";

type SpeechRoom = NonNullable<ReturnType<LiveKitLocalSpeechRoomPort["snapshot"]>>;
type CaptureState =
  | "off"
  | "preparing"
  | "ready"
  | "waiting-for-consent"
  | "waiting-for-audio"
  | "capturing"
  | "paused"
  | "unavailable";

interface BrowserLocalSpeechOptions {
  /** Authenticated requester/account or generated private browser-local principal, not a display name. */
  readonly requesterPrincipal: string;
  readonly port: LiveKitLocalSpeechRoomPort;
  readonly meetingTimeMs: () => number;
  readonly stateChanged: (state: CaptureState) => void;
  readonly peersChanged: (peers: readonly PeerTranscriptRequest[]) => void;
  readonly sink: LocalSpeechSink;
}

type Preparation = Parameters<typeof openLocalSpeechWorker>[0];

/**
 * Session composition only. Nothing may call prepare or start on behalf of
 * the user automatically; this module is separate from the recorder.
 */
export function composeBrowserLocalSpeech(options: BrowserLocalSpeechOptions) {
  const { port, sink } = options;
  const teardown = new Set<() => void>();
  let endpoints: LocalSpeechEndpoint | null = null;
  let ingress: ReturnType<typeof createLocalSpeechIngress> | null = null;
  let context: AudioContext | null = null;
  let pendingPrepare: AbortController | null = null;
  let fence: LocalTranscriptionFence | null = null;
  let request: TranscriptionRequest | null = null;
  const peers = createPeerTranscriptConsent(port, options.peersChanged);
  let requestPeers: {
    readonly sids: readonly string[];
    readonly revision: number;
  } | null = null;
  let attaching = false;
  let closed = false;
  let localEpoch: string | null = null;

  const state = (value: CaptureState) => {
    if (!closed) options.stateChanged(value);
  };

  const stopScope = (next: CaptureState, dropModel: boolean) => {
    fence?.stop();
    const ending = request;
    const endingPeers = requestPeers;
    request = null;
    requestPeers = null;
    attaching = false;
    for (const remove of teardown) remove();
    teardown.clear();
    ingress?.cut();
    ingress = null;
    if (dropModel) {
      endpoints?.close();
      endpoints = null;
    }
    const audio = context;
    context = null;
    if (audio !== null) void audio.close().catch(() => undefined);
    state(next);
    if (ending !== null && endingPeers !== null && endingPeers.sids.length > 0) {
      void port.sendConsent(endingPeers.sids, {
        kind: "status",
        requestId: ending.id,
        roomEpoch: ending.roomEpoch,
        revision: endingPeers.revision,
        status: "ended",
      });
    }
  };

  const bindAudio = async (snapshot: SpeechRoom) => {
    const guarded = fence;
    const audio = context;
    const endpoint = endpoints;
    if (
      guarded === null ||
      audio === null ||
      endpoint === null ||
      request === null ||
      guarded.state !== "admitted" ||
      attaching ||
      ingress !== null
    )
      return;
    // Keep this first desktop profile bounded. Unsupported larger meetings
    // get an unavailable state instead of silently omitting speakers.
    if (snapshot.audio.length > 8 || audio.sampleRate !== LOCAL_SPEECH_RATE) {
      stopScope("unavailable", true);
      return;
    }
    if (snapshot.audio.length === 0) {
      state("waiting-for-audio");
      return;
    }
    const leases = snapshot.audio.flatMap((source) => {
      const lease = guarded.leaseFor(source);
      return lease === null ? [] : [{ source, lease }];
    });
    if (leases.length !== snapshot.audio.length) {
      stopScope("paused", true);
      return;
    }
    attaching = true;
    const input = createLocalSpeechIngress(guarded, endpoint, {
      settle: sink.settle,
      gap: sink.gap,
      unavailable: () => {
        stopScope("unavailable", true);
        sink.unavailable();
      },
    });
    ingress = input;
    let attached = 0;
    for (const { source, lease } of leases) {
      if (!guarded.isCurrent(lease) || ingress !== input) break;
      const remove = await bindLocalTranscriptionTrack({
        context: audio,
        track: source.track,
        fence: guarded,
        lease,
        meetingTimeMs: options.meetingTimeMs,
        onFrame: (current: TranscriptionLease, frame) => {
          input.offer(current, frame);
        },
        onGap: sink.gap,
        onCut: () => stopScope("paused", true),
        onUnavailable: () => stopScope("unavailable", true),
      });
      if (remove === null) continue;
      if (!guarded.isCurrent(lease) || ingress !== input) {
        remove();
        break;
      }
      teardown.add(remove);
      attached += 1;
    }
    attaching = false;
    if (ingress !== input) return;
    if (attached !== leases.length) {
      stopScope("paused", true);
      return;
    }
    state("capturing");
    const liveRequest = request;
    const peers = requestPeers;
    if (liveRequest !== null && peers !== null && peers.sids.length > 0) {
      const delivered = await port.sendConsent(peers.sids, {
        kind: "status",
        requestId: liveRequest.id,
        roomEpoch: liveRequest.roomEpoch,
        revision: peers.revision,
        status: "running",
      });
      if (!delivered && request === liveRequest) stopScope("paused", true);
    }
  };

  const removeFacts = port.subscribe((snapshot) => {
    if (snapshot === null) {
      if (request !== null) stopScope("paused", ingress !== null);
      fence?.invalidateRoom();
    } else {
      if (localEpoch !== null && localEpoch !== snapshot.roster.roomEpoch) peers.clear();
      localEpoch = snapshot.roster.roomEpoch;
      peers.prune(snapshot.roster.participantSessionIds);
    }
  });

  const removeWire = port.onConsent((sender, event) => {
    const snapshot = port.snapshot();
    if (closed || snapshot === null) return;
    if (event.kind === "status") {
      peers.status(sender, event);
      return;
    }
    if (event.kind === "request") {
      peers.request(sender, event);
      return;
    }
    if (event.kind !== "response" || fence === null || request === null) return;
    fence.applyGrant({
      requestId: event.requestId,
      roomEpoch: event.roomEpoch,
      rosterRevision: event.revision,
      fromSessionId: sender,
      response: event.response,
    });
    if (fence.state === "off") stopScope("paused", ingress !== null);
    else if (fence.state === "admitted") void bindAudio(snapshot);
  });

  return {
    /** Called only by explicit model-download action. Never asks for room consent. */
    async prepare(preparation: Preparation): Promise<boolean> {
      if (closed || request !== null || pendingPrepare !== null) return false;
      endpoints?.close();
      endpoints = null;
      const attempt = new AbortController();
      pendingPrepare = attempt;
      state("preparing");
      try {
        const endpoint = await openLocalSpeechWorker({
          ...preparation,
          signal: AbortSignal.any([preparation.signal, attempt.signal]),
        });
        if (closed || pendingPrepare !== attempt || attempt.signal.aborted) {
          endpoint.close();
          return false;
        }
        endpoints = endpoint;
        state("ready");
        return true;
      } catch {
        if (pendingPrepare === attempt && !closed) state("unavailable");
        return false;
      } finally {
        if (pendingPrepare === attempt) pendingPrepare = null;
      }
    },
    cancelPrepare() {
      pendingPrepare?.abort();
      pendingPrepare = null;
      state("off");
    },
    /** Click to request consent after model readiness; no media before responses. */
    async request(retention: TranscriptionRequest["retention"]): Promise<boolean> {
      const snapshot = port.snapshot();
      if (closed || request !== null || snapshot === null) return false;
      if (endpoints === null) {
        state("off");
        return false;
      }
      if (!snapshot.roster.canAskEveryone) {
        await port.checkCapability();
        state("ready");
        return false;
      }
      const chosen: TranscriptionRequest = {
        id: crypto.randomUUID(),
        requesterPrincipal: options.requesterPrincipal,
        requesterSessionId: snapshot.localSessionId,
        roomEpoch: snapshot.roster.roomEpoch,
        retention,
      };
      const roomFence = new LocalTranscriptionFence(
        options.requesterPrincipal,
        snapshot.localSessionId,
      );
      roomFence.setModelReady(true);
      roomFence.replaceRoster(snapshot.roster);
      if (!roomFence.begin(chosen)) return false;
      try {
        context = new AudioContext({ sampleRate: LOCAL_SPEECH_RATE });
        // Begin browser playback permission inside the opt-in click. The empty context
        // has no source until every required purpose grant has been received.
        void context.resume().catch(() => undefined);
      } catch {
        state("unavailable");
        return false;
      }
      fence = roomFence;
      request = chosen;
      roomFence.applyGrant({
        requestId: chosen.id,
        roomEpoch: chosen.roomEpoch,
        rosterRevision: snapshot.roster.revision,
        fromSessionId: snapshot.localSessionId,
        response: "allow",
      });
      state("waiting-for-consent");
      const peers = snapshot.roster.participantSessionIds.filter(
        (id) => id !== snapshot.localSessionId,
      );
      requestPeers = { sids: peers, revision: snapshot.roster.revision };
      if (peers.length === 0) {
        await bindAudio(snapshot);
        return request === chosen;
      }
      const sent = await port.sendConsent(peers, {
        kind: "request",
        requestId: chosen.id,
        roomEpoch: chosen.roomEpoch,
        revision: snapshot.roster.revision,
        retention,
      });
      if (!sent && request === chosen) stopScope("paused", false);
      return sent && request === chosen;
    },
    /** Display prompt first; never implicitly consent. Keep the ability to revoke. */
    answer: peers.answer,
    pause() {
      if (!closed) stopScope("paused", ingress !== null);
    },
    close() {
      if (closed) return;
      stopScope("off", true);
      closed = true;
      pendingPrepare?.abort();
      pendingPrepare = null;
      peers.clear();
      removeFacts();
      removeWire();
    },
  };
}
