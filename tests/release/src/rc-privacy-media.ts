import type { BrowserContext, Locator, Page } from "@playwright/test";

export type MarkerPerson = "A" | "B" | "C";
export type MarkerPhase = 0 | 1;
export type MarkerId = "a0" | "a1" | "b0" | "b1" | "c0" | "c1" | "share0" | "share1";

// Distinct saturated colors survive LiveKit and composite encoding. In each source frame,
// the central binary strip records the rolling source sequence (low bit at left).
export const VIDEO_COLORS: Readonly<Record<MarkerId, readonly [number, number, number]>> = {
  a0: [240, 22, 22],
  a1: [240, 119, 22],
  b0: [22, 240, 22],
  b1: [112, 240, 22],
  c0: [22, 22, 240],
  c1: [22, 127, 240],
  share0: [226, 22, 226],
  share1: [22, 225, 225],
};
// A marker is a frequency pair. The upper band corroborates the primary tone
// when a level change or codec transient resembles a different primary tone.
export const AUDIO_HZ: Readonly<Record<MarkerId, readonly [number, number]>> = {
  a0: [350, 2050],
  a1: [535, 2640],
  b0: [735, 2250],
  b1: [920, 3050],
  c0: [1120, 2415],
  c1: [1310, 2840],
  share0: [1510, 3260],
  share1: [1740, 3470],
};

export interface PrivacyEvent {
  readonly at: number;
  readonly kind: string;
  readonly value: string;
  readonly sourceTrackId?: string;
}

interface PrivacyState {
  readonly events: PrivacyEvent[];
  phase: MarkerPhase;
  freezeVideo: boolean;
  startShortClip: (() => void) | null;
  microphoneMode: "observe" | "hold" | null;
  releaseMic: (() => void) | null;
  readonly microphoneTracks: MediaStreamTrack[];
  readonly sourceSequences: Partial<Record<MarkerId, number>>;
  readonly mixerTracks: Map<
    string,
    { readonly stream: MediaStream; readonly context: AudioContext }
  >;
}

type PrivacyWindow = Window & { __kmPrivacy?: PrivacyState };

function installInPage(options: {
  readonly person: MarkerPerson;
  readonly colors: typeof VIDEO_COLORS;
  readonly frequencies: typeof AUDIO_HZ;
}): void {
  const state: PrivacyState = {
    phase: 0,
    freezeVideo: false,
    startShortClip: null,
    microphoneMode: null,
    releaseMic: null,
    events: [],
    microphoneTracks: [],
    sourceSequences: {},
    mixerTracks: new Map(),
  };
  (window as PrivacyWindow).__kmPrivacy = state;
  function note(kind: string, value = ""): void {
    state.events.push({ at: performance.timeOrigin + performance.now(), kind, value });
  }
  function marker(isShare: boolean): MarkerId {
    return `${isShare ? "share" : options.person.toLowerCase()}${state.phase}` as MarkerId;
  }
  const nativeCapture = HTMLCanvasElement.prototype.captureStream;
  const nativeCreateSource = AudioContext.prototype.createMediaStreamSource;
  const nativeAudioDestination = AudioContext.prototype.createMediaStreamDestination;
  const nativeConnect = AudioNode.prototype.connect;
  const composite = new WeakSet<HTMLCanvasElement>();
  window.addEventListener("km-fixture-compositor-source", (event) => {
    if (event instanceof CustomEvent && event.detail instanceof HTMLCanvasElement) {
      composite.add(event.detail);
    }
  });
  const audioSources = new WeakMap<AudioNode, MediaStream>();
  const gains = new WeakMap<AudioNode, MediaStream>();
  const destinations = new WeakSet<AudioNode>();

  HTMLCanvasElement.prototype.captureStream = function (this: HTMLCanvasElement, rate) {
    if (this.width === 1280 && this.height === 720) {
      composite.add(this);
      note("compositor-track-created");
    }
    return nativeCapture.call(this, rate);
  };
  const nativeFill = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function (
    this: CanvasRenderingContext2D,
    x,
    y,
    width,
    height,
  ) {
    if (
      composite.has(this.canvas) &&
      x === 0 &&
      y === 0 &&
      width === this.canvas.width &&
      height === this.canvas.height
    ) {
      note("compositor-frame-begin");
    }
    nativeFill.call(this, x, y, width, height);
  };
  const nativeText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (
    this: CanvasRenderingContext2D,
    label,
    x,
    y,
    maxWidth,
  ) {
    if (composite.has(this.canvas)) note("compositor-label", label);
    return nativeText.call(this, label, x, y, maxWidth);
  };
  const nativeDraw = CanvasRenderingContext2D.prototype.drawImage as (
    input: CanvasImageSource,
    ...coordinates: number[]
  ) => void;
  let sampleCanvas: HTMLCanvasElement | undefined;
  CanvasRenderingContext2D.prototype.drawImage = function (
    this: CanvasRenderingContext2D,
    input: CanvasImageSource,
    ...coordinates: number[]
  ) {
    if (composite.has(this.canvas) && input instanceof HTMLVideoElement) {
      sampleCanvas ??= Object.assign(document.createElement("canvas"), { width: 16, height: 8 });
      const sample = sampleCanvas.getContext("2d", { willReadFrequently: true });
      if (sample !== null) {
        nativeDraw.call(sample, input, 0, 0, 16, 8);
        const pixel = sample.getImageData(8, 1, 1, 1).data;
        const matching = Object.entries(options.colors).find(
          ([, [r, g, b]]) =>
            Math.abs((pixel[0] ?? 0) - r) +
              Math.abs((pixel[1] ?? 0) - g) +
              Math.abs((pixel[2] ?? 0) - b) <
            95,
        );
        let sequence = 0;
        for (let bit = 0; bit < 8; bit += 1) {
          if ((sample.getImageData(4 + bit, 4, 1, 1).data[0] ?? 0) > 128) sequence |= 1 << bit;
        }
        note(
          "compositor-frame",
          matching === undefined ? "unresolved" : `${matching[0]}:${sequence}`,
        );
        if (matching?.[0] === "a0" && state.startShortClip !== null) {
          const start = state.startShortClip;
          state.startShortClip = null;
          start();
        }
      }
    }
    nativeDraw.call(this, input, ...coordinates);
  };

  AudioContext.prototype.createMediaStreamSource = function (this: AudioContext, stream) {
    const node = nativeCreateSource.call(this, stream);
    audioSources.set(node, stream);
    return node;
  };
  AudioContext.prototype.createMediaStreamDestination = function (this: AudioContext) {
    const node = nativeAudioDestination.call(this);
    destinations.add(node);
    return node;
  };
  AudioNode.prototype.connect = function (
    this: AudioNode,
    target: AudioNode | AudioParam,
    output?: number,
    input?: number,
  ) {
    const source = audioSources.get(this);
    if (source !== undefined && target instanceof GainNode) gains.set(target, source);
    const admitted = gains.get(this);
    if (admitted !== undefined && target instanceof AudioNode && destinations.has(target)) {
      const track = admitted.getAudioTracks()[0];
      if (track !== undefined) {
        state.mixerTracks.set(track.id, {
          stream: admitted,
          context: this.context as AudioContext,
        });
        note("mixer-connected", track.id);
      }
    }
    return Reflect.apply(
      nativeConnect,
      this,
      target instanceof AudioNode ? [target, output ?? 0, input ?? 0] : [target, output ?? 0],
    );
  } as typeof AudioNode.prototype.connect;
  const nativeDisconnect = AudioNode.prototype.disconnect;
  AudioNode.prototype.disconnect = function (this: AudioNode, ...arguments_: unknown[]) {
    const stream = gains.get(this);
    if (stream !== undefined) note("mixer-disconnected", stream.getAudioTracks()[0]?.id ?? "");
    Reflect.apply(nativeDisconnect, this, arguments_);
  } as typeof AudioNode.prototype.disconnect;

  const rtcTracks = new WeakSet<MediaStreamTrack>();
  const nativeAddTrack = RTCPeerConnection.prototype.addTrack;
  RTCPeerConnection.prototype.addTrack = function (this: RTCPeerConnection, track, ...streams) {
    rtcTracks.add(track);
    return nativeAddTrack.call(this, track, ...streams);
  };
  const nativeTransceiver = RTCPeerConnection.prototype.addTransceiver;
  RTCPeerConnection.prototype.addTransceiver = function (this: RTCPeerConnection, track, init) {
    if (track instanceof MediaStreamTrack) rtcTracks.add(track);
    return nativeTransceiver.call(this, track, init);
  };
  const nativeReplaceTrack = RTCRtpSender.prototype.replaceTrack;
  RTCRtpSender.prototype.replaceTrack = function (this: RTCRtpSender, track) {
    if (track !== null) rtcTracks.add(track);
    return nativeReplaceTrack.call(this, track);
  };
  const nativeStop = MediaStreamTrack.prototype.stop;
  const cleanup = new WeakMap<MediaStreamTrack, () => void>();
  MediaStreamTrack.prototype.stop = function (this: MediaStreamTrack) {
    nativeStop.call(this);
    if (state.microphoneTracks.includes(this)) note("microphone-track-ended", this.id);
    if (rtcTracks.has(this)) note("meeting-track-ended", this.id);
    cleanup.get(this)?.();
    cleanup.delete(this);
  };

  function markedVideo(isShare: boolean): MediaStreamTrack {
    const canvas = Object.assign(document.createElement("canvas"), { width: 640, height: 360 });
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("BLOCKED: marked camera canvas unavailable");
    const stream = nativeCapture.call(canvas, 0);
    const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
    if (track === undefined) throw new Error("BLOCKED: marked video track unavailable");
    let sequence = 0;
    const draw = (): void => {
      if (state.freezeVideo && sequence > 0) return;
      const id = marker(isShare);
      state.sourceSequences[id] = sequence;
      ctx.fillStyle = `rgb(${options.colors[id].join(",")})`;
      ctx.fillRect(0, 0, 640, 360);
      for (let bit = 0; bit < 8; bit += 1) {
        ctx.fillStyle = (sequence & (1 << bit)) === 0 ? "#000" : "#fff";
        ctx.fillRect(160 + 40 * bit, 140, 40, 80);
      }
      ctx.fillStyle = "#fff";
      ctx.font = "bold 42px sans-serif";
      ctx.fillText(`${id} ${sequence}`, 170, 110);
      note("source-frame", `${id}:${sequence}`);
      sequence += 1;
      track.requestFrame();
    };
    draw();
    const timer = window.setInterval(draw, 1000 / 30);
    cleanup.set(track, () => window.clearInterval(timer));
    return track;
  }

  function markedAudio(isShare: boolean): MediaStreamTrack {
    const ctx = new AudioContext();
    const output = nativeAudioDestination.call(ctx);
    const primary = ctx.createOscillator();
    const confirmation = ctx.createOscillator();
    const gain = ctx.createGain();
    const confirmationGain = ctx.createGain();
    confirmationGain.gain.value = 0.06;
    primary.connect(gain).connect(output);
    confirmation.connect(confirmationGain).connect(output);
    const track = output.stream.getAudioTracks()[0];
    if (track === undefined) throw new Error("BLOCKED: marked tone track unavailable");
    let sequence = 0;
    const update = (): void => {
      const id = marker(isShare);
      const [primaryHz, confirmationHz] = options.frequencies[id];
      const time = ctx.currentTime;
      primary.frequency.setValueAtTime(primaryHz, time);
      confirmation.frequency.setValueAtTime(confirmationHz, time);
      gain.gain.value = sequence % 2 === 0 ? 0.19 : 0.13;
      state.events.push({
        at: performance.timeOrigin + performance.now(),
        kind: "source-audio-window",
        value: `${id}:${sequence}`,
        sourceTrackId: track.id,
      });
      sequence += 1;
    };
    update();
    primary.start();
    confirmation.start();
    const timer = window.setInterval(update, 200);
    void ctx.resume();
    const resume = (): void => {
      void ctx.resume();
    };
    document.addEventListener("click", resume, { once: true, capture: true });
    cleanup.set(track, () => {
      document.removeEventListener("click", resume, { capture: true });
      window.clearInterval(timer);
      void ctx.close();
    });
    return track;
  }

  const nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    const mode = constraints?.audio && !constraints.video ? state.microphoneMode : null;
    if (mode !== null) state.microphoneMode = null;
    const original = await nativeGetUserMedia(constraints);
    const markers = original.getTracks().map((track) => {
      const replacement = track.kind === "video" ? markedVideo(false) : markedAudio(false);
      const settings = track.getSettings();
      replacement.getSettings = () => settings;
      track.stop();
      return replacement;
    });
    if (mode !== null) {
      state.microphoneTracks.push(...markers);
      note("microphone-acquired", markers.map(({ id }) => id).join(","));
    }
    if (mode === "hold") {
      note("microphone-acquired-held", markers.map(({ id }) => id).join(","));
      await new Promise<void>((resolve) => {
        state.releaseMic = resolve;
      });
      note("microphone-acquired-released", markers.map(({ id }) => id).join(","));
    }
    return new MediaStream(markers);
  };
  // The test host's picker cannot independently guarantee marked share audio. Replace
  // acquisition only. The app still chooses, publishes, receives and mixes this share.
  navigator.mediaDevices.getDisplayMedia = async () => {
    note("marked-share-acquisition-substitution");
    const video = markedVideo(true);
    const audio = markedAudio(true);
    return new MediaStream([video, audio]);
  };
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest("[data-testid]") : null;
      const id = target?.getAttribute("data-testid");
      if (id !== null && id !== undefined) note("room-action", id);
    },
    { capture: true },
  );
}

export async function installPrivacyMedia(
  context: BrowserContext,
  person: MarkerPerson,
): Promise<void> {
  await context.addInitScript(installInPage, {
    person,
    colors: VIDEO_COLORS,
    frequencies: AUDIO_HZ,
  });
}

export async function setMarkerPhase(page: Page, phase: MarkerPhase): Promise<void> {
  await page.evaluate((next) => {
    const state = (window as PrivacyWindow).__kmPrivacy;
    if (state !== undefined) {
      state.phase = next;
      state.events.push({
        at: performance.timeOrigin + performance.now(),
        kind: "phase",
        value: String(next),
      });
    }
  }, phase);
}

export async function armShortClip(page: Page, stopTestId: string): Promise<void> {
  await page.evaluate((testId) => {
    const state = (window as PrivacyWindow).__kmPrivacy;
    if (state === undefined) throw new Error("BLOCKED: marked media fixture unavailable");
    state.startShortClip = () => {
      window.setTimeout(() => {
        state.phase = 1;
        state.events.push({
          at: performance.timeOrigin + performance.now(),
          kind: "phase",
          value: "1",
        });
      }, 360);
      window.setTimeout(() => {
        const control = document.querySelector(`[data-testid="${testId}"][data-state="on"]`);
        if (control instanceof HTMLButtonElement) control.click();
      }, 900);
    };
  }, stopTestId);
}

export async function freezeMarkerVideo(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = (window as PrivacyWindow).__kmPrivacy;
    if (state !== undefined) state.freezeVideo = true;
  });
}

export async function setPrivacyMicHold(
  page: Page,
  hold: "arm" | "observe" | "release",
): Promise<void> {
  await page.evaluate((operation) => {
    const state = (window as PrivacyWindow).__kmPrivacy;
    if (state === undefined) throw new Error("BLOCKED: microphone fixture unavailable");
    if (operation === "release") state.releaseMic?.();
    else state.microphoneMode = operation === "arm" ? "hold" : "observe";
  }, hold);
}

export async function readBrowserMedia(page: Page) {
  return page.evaluate(() => {
    const state = (window as PrivacyWindow).__kmPrivacy;
    if (state === undefined) throw new Error("BLOCKED: browser marker observer unavailable");
    return {
      events: state.events,
      sourceSequences: state.sourceSequences,
      heldMicrophones: state.microphoneTracks.map((track) => ({
        id: track.id,
        state: track.readyState,
      })),
      mixerTracks: [...state.mixerTracks].map(([id, value]) => ({
        id,
        state: value.stream.getAudioTracks()[0]?.readyState,
        contextState: value.context.state,
      })),
    };
  });
}

export async function receivedVideo(locator: Locator, marker: MarkerId): Promise<boolean> {
  return locator.evaluate((element, [r, g, b]) => {
    const video = element as HTMLVideoElement;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;
    const canvas = Object.assign(document.createElement("canvas"), { width: 16, height: 8 });
    const ctx = canvas.getContext("2d");
    if (ctx === null) return false;
    ctx.drawImage(video, 0, 0, 16, 8);
    const pixels = ctx.getImageData(8, 1, 1, 1).data;
    return (
      Math.abs((pixels[0] ?? 0) - r) +
        Math.abs((pixels[1] ?? 0) - g) +
        Math.abs((pixels[2] ?? 0) - b) <
      95
    );
  }, VIDEO_COLORS[marker]);
}

export async function receivedTone(
  locator: Locator,
  marker: MarkerId,
): Promise<{ trackId: string; present: boolean }> {
  return locator.evaluate(async (element, frequencies) => {
    const stream = (element as HTMLMediaElement).srcObject;
    const track = stream instanceof MediaStream ? stream.getAudioTracks()[0] : undefined;
    if (track === undefined || track.readyState !== "live") return { trackId: "", present: false };
    const ctx = new AudioContext();
    try {
      const source = ctx.createMediaStreamSource(new MediaStream([track]));
      const spectrum = ctx.createAnalyser();
      spectrum.fftSize = 4096;
      const mute = ctx.createGain();
      mute.gain.value = 0;
      source.connect(spectrum).connect(mute).connect(ctx.destination);
      void ctx.resume();
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      const bins = new Float32Array(spectrum.frequencyBinCount);
      spectrum.getFloatFrequencyData(bins);
      const present = frequencies.every((frequency) => {
        const bin = Math.round((frequency * spectrum.fftSize) / ctx.sampleRate);
        const peak = Math.max(...bins.slice(bin - 2, bin + 3));
        const neighbor = Math.max(...bins.slice(bin - 7, bin - 3), ...bins.slice(bin + 4, bin + 8));
        return peak > -55 && peak - neighbor > 8;
      });
      return { trackId: track.id, present };
    } finally {
      await ctx.close();
    }
  }, AUDIO_HZ[marker]);
}
