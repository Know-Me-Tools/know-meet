import type { MediaTarget, RealtimeRoom } from "@know-meet/application";
import type { ConnectionState } from "@know-meet/domain";
import type { Room, RoomOptions } from "livekit-client";
import { type DiagnosticSink, ignoreDiagnostic } from "../../application/diagnostics.ts";
import { createMediaBindings } from "../../application/media-bindings.ts";
import { createSnapshotStore } from "../../application/snapshot-store.ts";
import { initialSnapshot } from "../../domain/snapshot-mapping.ts";
import { detectConferencingSupport } from "../browser/conferencing-support.ts";
import { getDeviceCatalog } from "../browser/device-catalog.ts";
import { createStartAudio } from "./audio-playback.ts";
import { createBackgroundEffects } from "./background-effect.ts";
import { createConnectionLifecycle } from "./connection-lifecycle.ts";
import { createDevices } from "./devices.ts";
import {
  createLocalSpeechRoomPort,
  type LiveKitLocalSpeechRoomPort,
} from "./local-speech-room-port.ts";
import { createSetMediaEnabled } from "./media-control.ts";
import { readRoomFacts } from "./room-facts.ts";
import { createSetScreenShareEnabled } from "./screen-share.ts";
import { createSessionHost } from "./session-host.ts";
import { createTextStreams } from "./text-streams.ts";
import { createTrackResolver } from "./track-resolver.ts";
import type { VideoProcessorHook } from "./video-processor-hook.ts";

export interface LiveKitRealtimeRoomOptions {
  /**
   * Let the SDK pause remote video whose element is hidden or small. Off by default: a
   * two-person call gains little, and a hidden or background tab would stop video (README).
   */
  readonly adaptiveStream?: boolean;
  /** Let the publisher pause simulcast layers nobody watches. On by default. */
  readonly dynacast?: boolean;
  /** Receives connection, failure and audio-playback events. Never receives a token. */
  readonly onDiagnostic?: DiagnosticSink;
  /**
   * The background processor (wc07). Without it `support.backgroundEffects` is unsupported
   * and only `none` is accepted. The lazy room must be told the same (`backgroundEffects`).
   */
  readonly videoProcessor?: VideoProcessorHook;
  /** Optional browser-local speech feature; no hooks are installed when it is absent. */
  readonly onLocalSpeechRoom?: (port: LiveKitLocalSpeechRoomPort | null) => void;
}

/**
 * The RealtimeRoom port over livekit-client. Nothing it returns names an SDK type. It opens
 * no connection until `connect`, so a refused token request never reaches the media server.
 * Device list and support are current from creation, before any connect.
 */
export function createLiveKitRealtimeRoom(options: LiveKitRealtimeRoomOptions = {}): RealtimeRoom {
  const report = options.onDiagnostic ?? ignoreDiagnostic;
  const baseRoomOptions: RoomOptions = {
    adaptiveStream: options.adaptiveStream ?? false,
    dynacast: options.dynacast ?? true,
    webAudioMix: false,
  };
  const support = detectConferencingSupport({
    backgroundEffects: options.videoProcessor !== undefined,
  });
  const catalog = getDeviceCatalog();
  const store = createSnapshotStore(initialSnapshot(support, catalog.current()));
  const bindings = createMediaBindings();

  /**
   * Re-reads the SDK, publishes a new snapshot if anything changed, and re-binds media. Runs
   * only from `host.refresh`, which nothing calls before the features below exist.
   */
  const onRefresh = (room: Room | null, connection: ConnectionState): void => {
    effects.reconcile(room);
    store.update({
      ...readRoomFacts(room, connection, devices.requested()),
      chat: text.chat(),
      availableDevices: catalog.current(),
      backgroundEffect: effects.state(),
      support,
    });
    bindings.reconcile(createTrackResolver(room));
  };

  const host = createSessionHost(report, onRefresh);
  const devices = createDevices(host, catalog, support);
  const text = createTextStreams(host);
  const effects = createBackgroundEffects(host, options.videoProcessor, support);
  let localSpeech: LiveKitLocalSpeechRoomPort | null = null;
  const lifecycle = createConnectionLifecycle(host, {
    roomOptionsFor: (connectOptions) =>
      devices.roomOptionsFor(baseRoomOptions, connectOptions.devices),
    onSessionStart: (session) => {
      text.attach(session);
      if (options.onLocalSpeechRoom !== undefined) {
        try {
          localSpeech = createLocalSpeechRoomPort(session.room);
          options.onLocalSpeechRoom(localSpeech);
        } catch {
          localSpeech?.close();
          localSpeech = null;
        }
      }
    },
    onSessionReset: () => {
      if (localSpeech !== null) {
        localSpeech.close();
        localSpeech = null;
        try {
          options.onLocalSpeechRoom?.(null);
        } catch {
          /* meeting remains independent */
        }
      }
      text.reset();
      effects.reset();
    },
  });
  // Page lifetime, like the catalog itself: the lobby lists devices before any connect.
  catalog.subscribe(() => host.refresh());

  return {
    connect: lifecycle.connect,
    disconnect: lifecycle.disconnect,
    setMediaEnabled: createSetMediaEnabled(host, catalog, () => devices.requested()),
    getSnapshot: store.get,
    subscribe: store.subscribe,
    attachMedia: (target: MediaTarget, element: HTMLMediaElement) =>
      bindings.bind(target, element, createTrackResolver(host.session()?.room ?? null)),
    setScreenShareEnabled: createSetScreenShareEnabled(host, support),
    sendChat: text.sendChat,
    refreshDevices: devices.refreshDevices,
    selectDevice: devices.selectDevice,
    startAudio: createStartAudio(host),
    setBackgroundEffect: effects.setBackgroundEffect,
    prepareBackgroundEffects: effects.prepareBackgroundEffects,
    sendConsentMessage: text.sendConsentMessage,
    onConsentMessage: text.onConsentMessage,
  };
}
