import type { LiveKitLocalSpeechRoomPort } from "@know-meet/realtime";
import { supportsLocalSpeechCapture } from "../../infrastructure/local-transcription/browser-speech-profile";
import { composeBrowserLocalSpeech } from "../../infrastructure/local-transcription/compose-browser-local-speech";
import { createLocalTranscriptStore } from "../../infrastructure/local-transcription/local-transcript-store";
import { REVIEWED_SPEECH_PROFILE } from "../../infrastructure/local-transcription/reviewed-speech-profile";
import type {
  LocalTranscriptLine,
  LocalTranscriptServices,
  LocalTranscriptView,
} from "../../presentation/guest-meeting/local-transcript-services";

const MAX_LINES = 4_000;
const empty: LocalTranscriptView = {
  state: "off",
  peers: [],
  roomReady: false,
  roomSupportsConsent: false,
  localCaptureSupported: false,
  lines: [],
  omittedLines: false,
  canKeep: false,
  saveStatus: "unsaved",
};

export function composeLocalTranscript(canUseGuestStorage: () => boolean) {
  const profile = REVIEWED_SPEECH_PROFILE;
  const supported = supportsLocalSpeechCapture();
  const listeners = new Set<() => void>();
  const store = createLocalTranscriptStore();
  // The current hosted product has guest profiles, not authenticated account
  // identities. Never bind storage to a display name or mock sign-in metadata.
  const ownerKey = "km-transcript-local-guest-v1";
  function guestOwner(create: boolean): string | null {
    if (!canUseGuestStorage())
      throw new Error("Transcript storage is not available for this session");
    const present = localStorage.getItem(ownerKey);
    if (present !== null) return present;
    if (!create) return null;
    localStorage.setItem(ownerKey, crypto.randomUUID());
    return localStorage.getItem(ownerKey);
  }
  const readableOwner = (owner: string) => {
    if (guestOwner(false) !== owner) throw new Error("Transcript scope changed");
  };
  let view = empty;
  let sequence = 0;
  let transcriptId: string | null = null;
  let saveAttempt: string | null = null;
  let activeRetention: "ephemeral" | "may-save-locally" = "ephemeral";
  let controller: ReturnType<typeof composeBrowserLocalSpeech> | null = null;
  let release: (() => void) | null = null;
  let preparation: AbortController | null = null;

  const set = (patch: Partial<LocalTranscriptView>) => {
    view = { ...view, ...patch };
    for (const listener of listeners) listener();
  };
  const append = (line: Omit<LocalTranscriptLine, "id">, keep = false) => {
    const old = view.lines;
    set({
      lines: [...old.slice(1 - MAX_LINES), { ...line, id: ++sequence }],
      omittedLines: view.omittedLines || old.length === MAX_LINES,
      canKeep: view.canKeep || keep,
      saveStatus: view.saveStatus === "saving" ? "saving" : "unsaved",
    });
  };

  const attach = (port: LiveKitLocalSpeechRoomPort | null) => {
    preparation?.abort();
    preparation = null;
    release?.();
    release = null;
    controller?.close();
    controller = null;
    store.resetLiveSearch();
    transcriptId = null;
    activeRetention = "ephemeral";
    set({
      ...empty,
      localCaptureSupported: supported,
      state: supported ? "off" : "unavailable",
    });
    if (port === null) return;
    const roomOpenedAt = performance.now();
    controller = composeBrowserLocalSpeech({
      requesterPrincipal: crypto.randomUUID(),
      port,
      meetingTimeMs: () => performance.now() - roomOpenedAt,
      stateChanged: (state) => {
        if (state === "waiting-for-consent") {
          store.resetLiveSearch();
          transcriptId = crypto.randomUUID();
          set({
            state,
            lines: [],
            omittedLines: false,
            canKeep: false,
            saveStatus: "unsaved",
          });
        } else set({ state });
      },
      peersChanged: (peers) => set({ peers }),
      sink: {
        settle: ({ source, startMs, endMs, text, retention }) => {
          const keep =
            retention === "may-save-locally" &&
            activeRetention === retention &&
            transcriptId !== null;
          const observed = port
            .snapshot()
            ?.audio.find(
              (item) =>
                item.participantSessionId === source.participantSessionId &&
                item.trackInstanceId === source.trackInstanceId,
            );
          append(
            {
              startMs,
              endMs,
              text,
              gap: false,
              speaker: observed?.displayName ?? null,
            },
            keep,
          );
        },
        gap: (startMs, endMs) =>
          append({
            startMs,
            endMs,
            text: "Some speech was not captured.",
            gap: true,
            speaker: null,
          }),
        unavailable: () => set({ state: "unavailable" }),
      },
    });
    release = port.subscribe((room) =>
      set({
        roomReady: room !== null,
        roomSupportsConsent: room?.roster.canAskEveryone === true,
      }),
    );
  };

  const services: LocalTranscriptServices = {
    downloadBytes: profile.downloadBytes,
    getSnapshot: () => view,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async prepare() {
      if (!supported || controller === null || preparation !== null) return false;
      const attempt = new AbortController();
      preparation = attempt;
      try {
        return await controller.prepare({ ...profile, signal: attempt.signal });
      } finally {
        if (preparation === attempt) preparation = null;
      }
    },
    cancelPrepare() {
      preparation?.abort();
      controller?.cancelPrepare();
    },
    async request(retention) {
      if (controller === null || view.state !== "ready") return false;
      if (retention === "may-save-locally" && !canUseGuestStorage()) return false;
      const prior = activeRetention;
      activeRetention = retention;
      const started = await controller.request(retention);
      if (!started && view.state === "ready") activeRetention = prior;
      return started;
    },
    answer: async (key, response) => (await controller?.answer(key, response)) ?? false,
    pause: () => controller?.pause(),
    canOfferRetention: canUseGuestStorage,
    searchLive: (query) => store.searchLive(view.lines, query),
    async save() {
      const id = transcriptId;
      if (
        id === null ||
        saveAttempt !== null ||
        !view.canKeep ||
        activeRetention !== "may-save-locally"
      )
        return;
      const lines = view.lines;
      const incomplete =
        view.omittedLines ||
        lines.some((line) => line.gap) ||
        view.state === "unavailable" ||
        view.state === "capturing" ||
        view.state === "waiting-for-audio";
      saveAttempt = id;
      set({ saveStatus: "saving" });
      try {
        const owner = guestOwner(true);
        if (owner === null) throw new Error("Browser refused local transcript storage");
        await store.save(
          owner,
          {
            id,
            label: "Meeting transcript",
            savedAt: new Date().toISOString(),
            incomplete,
          },
          lines,
        );
        readableOwner(owner);
        if (transcriptId === id) set({ saveStatus: view.lines === lines ? "saved" : "unsaved" });
      } catch {
        if (transcriptId === id) set({ saveStatus: "unconfirmed" });
      } finally {
        if (saveAttempt === id) saveAttempt = null;
      }
    },
    saved: {
      async list() {
        const owner = guestOwner(false);
        if (owner === null) return [];
        const result = await store.list(owner);
        readableOwner(owner);
        return result;
      },
      async open(id) {
        const owner = guestOwner(false);
        if (owner === null) return [];
        const result = await store.readLines(owner, id);
        readableOwner(owner);
        return result;
      },
      async search(id, query) {
        const owner = guestOwner(false);
        if (owner === null) return [];
        const result = await store.searchSaved(owner, id, query);
        readableOwner(owner);
        return result;
      },
      async remove(id) {
        const owner = guestOwner(false);
        if (owner === null) throw new Error("Local transcript is not present");
        await store.remove(owner, id);
        readableOwner(owner);
      },
    },
  };
  return { services, attach };
}
