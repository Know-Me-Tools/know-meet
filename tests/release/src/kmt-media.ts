import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { BrowserContext, Page } from "@playwright/test";
import { blocked } from "./release-env.ts";

export const SPEECH = "The blue folder is ready";
export const MARKERS = [431, 563, 677] as const;
const SAMPLE_RATE = 16_000;
const MAX_PCM = 64_000;
const SPEECH_WORKER = "/capabilities/local-speech/transcription-speech-worker.js";
const CAPTURE_WORKLET = "know-meet-local-speech-pcm";

export interface PcmWitness {
  readonly at: number;
  readonly samples: number;
  readonly markers: readonly number[];
}

export interface KmtMediaWitness {
  readonly pcm: readonly PcmWitness[];
  readonly captureNodes: readonly number[];
  readonly withdrawals: readonly number[];
  readonly alignmentGaps: number;
  readonly rtcSends: number;
  readonly suspectRtc: number;
  readonly publications: readonly string[];
}

interface KmtBrowser {
  __kmtReady?: () => Promise<boolean>;
  __kmtTone?: (value: boolean | number) => Promise<void>;
  __kmtPhrase?: () => Promise<number[]>;
  __kmtMedia?: () => KmtMediaWitness;
  __kmtStopWorker?: () => boolean;
  __kmtControl?: (marker: number) => void;
}

const encodedSpeech = (): string => {
  const file = process.env["KM_KMT_SPEECH_WAV"];
  const expected = process.env["KM_KMT_SPEECH_SHA256"];
  if (!file || !expected || !/^[a-f0-9]{64}$/.test(expected)) {
    throw blocked("freeze KM_KMT_SPEECH_WAV and KM_KMT_SPEECH_SHA256 before running the packet");
  }
  let data: Buffer;
  try {
    data = readFileSync(file);
  } catch {
    throw blocked("the frozen synthetic WAV cannot be read");
  }
  if (
    createHash("sha256").update(data).digest("hex") !== expected ||
    data.length < 44 ||
    data.length > 1_000_000 ||
    data.toString("ascii", 0, 4) !== "RIFF" ||
    data.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw blocked("the synthetic speech fixture does not match its frozen WAV receipt");
  }
  return data.toString("base64");
};

export async function installKmtMedia(context: BrowserContext, marker: number): Promise<void> {
  await context.addInitScript(
    ({
      marker,
      fixture,
      markers,
      sampleRate,
      maxPcm,
      speechWorker,
      captureWorklet,
      forbiddenText,
    }) => {
      const win = window as Window & KmtBrowser;
      const now = () => performance.timeOrigin + performance.now();
      const events: PcmWitness[] = [];
      const captureNodes: number[] = [];
      const withdrawals: number[] = [];
      let alignmentGaps = 0;
      const tracks = new Set<MediaStreamTrack>();
      let rtcSends = 0;
      let suspectRtc = 0;
      let asrWorker: Worker | null = null;
      let audio: AudioContext | null = null;
      let route: MediaStreamAudioDestinationNode | null = null;
      let tone: GainNode | null = null;
      let spoken: Promise<AudioBuffer> | null = null;

      // Use the native microphone flow for UI permissions and camera preview. Supply the
      // fixture only as the microphone input sent via the real LiveKit RTP connection.
      function openInput(): MediaStreamAudioDestinationNode {
        if (route !== null) return route;
        const context = new AudioContext({ sampleRate });
        audio = context;
        route = context.createMediaStreamDestination();
        const oscillator = context.createOscillator();
        oscillator.frequency.value = marker;
        tone = context.createGain();
        tone.gain.value = 0;
        oscillator.connect(tone).connect(route);
        oscillator.start();
        return route;
      }

      const nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await nativeGetUserMedia(constraints);
        if (!constraints?.audio) return stream;
        const [track] = openInput().stream.getAudioTracks();
        if (track === undefined) throw new Error("KMT microphone fixture has no track");
        for (const original of stream.getAudioTracks()) {
          stream.removeTrack(original);
          original.stop();
        }
        stream.addTrack(track.clone());
        return stream;
      };

      win.__kmtReady = async () => {
        const browser = navigator as Navigator & {
          gpu?: { requestAdapter: () => Promise<{ features: ReadonlySet<string> } | null> };
        };
        const adapter = await browser.gpu?.requestAdapter();
        return adapter?.features.has("shader-f16") === true;
      };
      win.__kmtTone = async (value) => {
        openInput();
        if (audio === null || tone === null) throw new Error("KMT microphone unavailable");
        await audio.resume();
        tone.gain.value = typeof value === "number" ? value : Number(value) * 0.075;
      };
      win.__kmtPhrase = async () => {
        const destination = openInput();
        const owner = audio;
        if (owner === null) throw new Error("KMT microphone unavailable");
        await owner.resume();
        if (spoken === null) {
          const bytes = Uint8Array.from(atob(fixture), (char) => char.charCodeAt(0));
          spoken = owner.decodeAudioData(bytes.buffer);
        }
        const buffer = await spoken;
        if (buffer.duration <= 0 || buffer.duration > 2.7) {
          throw new Error("KMT synthetic phrase must fit inside a capture window");
        }
        // The complete fixed schedule is installed once; no retry is driven by ASR output.
        const start = owner.currentTime + 0.2;
        const receipt = now() + 200;
        const offsets = [0, 5.25, 10.5];
        for (const offset of offsets) {
          const source = owner.createBufferSource();
          source.buffer = buffer;
          source.connect(destination);
          source.onended = () => source.disconnect();
          source.start(start + offset);
        }
        return offsets.map((offset) => receipt + offset * 1_000);
      };

      function mark(samples: Float32Array): number[] {
        if (samples.length > maxPcm || samples.length < 1_024) return [];
        return markers.filter((frequency) => {
          let y = 0;
          let x = 0;
          for (let i = 0; i < samples.length; i += 4) {
            const phase = (2 * Math.PI * frequency * i) / sampleRate;
            const sample = samples[i] ?? 0;
            x += sample * Math.cos(phase);
            y += sample * Math.sin(phase);
          }
          return (2 * Math.hypot(x, y)) / Math.ceil(samples.length / 4) > 0.012;
        });
      }

      const NativeWorker = window.Worker;
      class SpeechWitnessWorker extends NativeWorker {
        private readonly kmtSpeechWorker: boolean;

        constructor(scriptURL: string | URL, options?: WorkerOptions) {
          super(scriptURL, options);
          this.kmtSpeechWorker = new URL(scriptURL, location.href).pathname === speechWorker;
          if (this.kmtSpeechWorker) {
            asrWorker = this;
            this.addEventListener("message", ({ data }) => {
              if (data?.ok === true && data.result?.kind === "alignment-gap") alignmentGaps += 1;
            });
          }
        }

        override postMessage(
          message: unknown,
          transfer?: Transferable[] | StructuredSerializeOptions,
        ): void {
          if (
            this.kmtSpeechWorker &&
            typeof message === "object" &&
            message !== null &&
            "type" in message &&
            message.type === "transcribe" &&
            "samples" in message &&
            message.samples instanceof Float32Array
          ) {
            events.push({
              at: now(),
              samples: message.samples.length,
              markers: mark(message.samples),
            });
          }
          if (Array.isArray(transfer)) super.postMessage(message, transfer);
          else super.postMessage(message, transfer);
        }
      }
      window.Worker = SpeechWitnessWorker;

      const NativeWorklet = window.AudioWorkletNode;
      window.AudioWorkletNode = class extends NativeWorklet {
        constructor(context: BaseAudioContext, name: string, options?: AudioWorkletNodeOptions) {
          super(context, name, options);
          if (name === captureWorklet) captureNodes.push(now());
        }
      };

      const observedChannels = new WeakSet<RTCDataChannel>();
      const watchChannel = (channel: RTCDataChannel): void => {
        if (observedChannels.has(channel)) return;
        observedChannels.add(channel);
        const watch = (text: string, at: number) => {
          if (
            text.includes('"purpose":"speech-to-text-on-requesters-device"') &&
            text.includes('"kind":"response"') &&
            text.includes('"response":"withdraw"')
          ) {
            withdrawals.push(at);
          }
        };
        channel.addEventListener(
          "message",
          ({ data }) => {
            const at = now();
            const decoder = new TextDecoder();
            if (typeof data === "string") watch(data, at);
            else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
              watch(decoder.decode(data), at);
            } else if (data instanceof Blob) {
              void data.arrayBuffer().then((bytes) => watch(decoder.decode(bytes), at));
            }
          },
          { capture: true },
        );
      };
      // LiveKit assigns onmessage for both negotiated and remotely opened channels.
      // Attach before delegating to the native setter, independent of peer constructor wrappers.
      const channelPrototype = RTCDataChannel.prototype;
      const onMessage = Object.getOwnPropertyDescriptor(channelPrototype, "onmessage");
      const setOnMessage = onMessage?.set;
      if (!onMessage || !setOnMessage)
        throw new Error("KMT native data-channel observer unavailable");
      Object.defineProperty(channelPrototype, "onmessage", {
        ...onMessage,
        set(this: RTCDataChannel, handler: RTCDataChannel["onmessage"]) {
          if (handler !== null) watchChannel(this);
          setOnMessage.call(this, handler);
        },
      });

      const peer = RTCPeerConnection.prototype;
      const addTrack = peer.addTrack;
      peer.addTrack = function (this: RTCPeerConnection, ...args) {
        const sender = addTrack.apply(this, args);
        if (sender.track !== null) tracks.add(sender.track);
        return sender;
      };
      const addTransceiver = peer.addTransceiver;
      peer.addTransceiver = function (this: RTCPeerConnection, ...args) {
        const transceiver = addTransceiver.apply(this, args);
        const track = transceiver.sender.track;
        if (track !== null) tracks.add(track);
        return transceiver;
      };
      const replaceTrack = RTCRtpSender.prototype.replaceTrack;
      RTCRtpSender.prototype.replaceTrack = async function (this: RTCRtpSender, ...args) {
        await replaceTrack.apply(this, args);
        if (this.track !== null) tracks.add(this.track);
      };

      const nativeSend = RTCDataChannel.prototype.send as (
        body: string | Blob | ArrayBuffer | ArrayBufferView<ArrayBuffer>,
      ) => void;
      RTCDataChannel.prototype.send = function (
        this: RTCDataChannel,
        body: Parameters<typeof nativeSend>[0],
      ) {
        // The ordinary Opus microphone RTP path is deliberately outside this detector.
        // Inspect application data messages for raw PCM-sized input or our exact phrase.
        nativeSend.call(this, body);
        rtcSends += 1;
        const bytes =
          typeof body === "string"
            ? new TextEncoder().encode(body)
            : body instanceof ArrayBuffer
              ? new Uint8Array(body)
              : ArrayBuffer.isView(body)
                ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
                : null;
        if (bytes === null && body instanceof Blob) {
          if (body.size >= 64_000 || body.type.startsWith("audio/")) suspectRtc += 1;
          void body.text().then((value) => {
            if (value.toLowerCase().includes(forbiddenText)) suspectRtc += 1;
          });
        } else if (
          bytes !== null &&
          (bytes.byteLength >= 64_000 ||
            new TextDecoder().decode(bytes).toLowerCase().includes(forbiddenText))
        ) {
          suspectRtc += 1;
        }
      } as typeof RTCDataChannel.prototype.send;

      win.__kmtMedia = () => ({
        pcm: [...events],
        captureNodes: [...captureNodes],
        withdrawals: [...withdrawals],
        alignmentGaps,
        rtcSends,
        suspectRtc,
        publications: [...tracks].map((track) => track.id).sort(),
      });
      win.__kmtStopWorker = () => {
        if (asrWorker === null) return false;
        asrWorker.terminate();
        asrWorker = null;
        return true;
      };
      // A synthetic canary uses the production worker endpoint before model initialization.
      // It exercises the independent witness only and does not publish to the room.
      win.__kmtControl = (frequency) => {
        const worker = new Worker(speechWorker, { type: "module" });
        const pcm = Float32Array.from(
          { length: maxPcm },
          (_, i) => 0.075 * Math.sin((2 * Math.PI * frequency * i) / sampleRate),
        );
        worker.postMessage({ id: 1, type: "transcribe", samples: pcm }, [pcm.buffer]);
        worker.terminate();
        asrWorker = null;
      };
    },
    {
      marker,
      fixture: encodedSpeech(),
      markers: MARKERS,
      sampleRate: SAMPLE_RATE,
      maxPcm: MAX_PCM,
      speechWorker: SPEECH_WORKER,
      captureWorklet: CAPTURE_WORKLET,
      forbiddenText: SPEECH.toLowerCase(),
    },
  );
}

export async function speechGpu(page: Page): Promise<boolean> {
  return page.evaluate(async () => (window as Window & KmtBrowser).__kmtReady?.() ?? false);
}

export async function tone(page: Page, value: boolean | number): Promise<void> {
  await page.evaluate(async (on) => {
    const set = (window as Window & KmtBrowser).__kmtTone;
    if (!set) throw new Error("KMT tone witness unavailable");
    await set(on);
  }, value);
}

export async function playPhrase(page: Page): Promise<readonly number[]> {
  return page.evaluate(async () => {
    const play = (window as Window & KmtBrowser).__kmtPhrase;
    if (!play) throw new Error("KMT speech witness unavailable");
    return play();
  });
}

export async function readKmtMedia(page: Page): Promise<KmtMediaWitness> {
  return page.evaluate(() => {
    const read = (window as Window & KmtBrowser).__kmtMedia;
    if (!read) throw new Error("KMT media witness unavailable");
    return read();
  });
}

export async function stopSpeechWorker(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as Window & KmtBrowser).__kmtStopWorker?.() ?? false);
}

export async function sendPcmCanary(page: Page, marker: number): Promise<void> {
  await page.evaluate((frequency) => {
    const send = (window as Window & KmtBrowser).__kmtControl;
    if (!send) throw new Error("KMT PCM canary unavailable");
    send(frequency);
  }, marker);
}
