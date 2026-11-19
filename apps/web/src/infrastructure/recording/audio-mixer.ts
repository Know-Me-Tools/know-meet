// TJ-ARCH-MOB-001 compliant

/**
 * Mixes every audio source of the meeting into one track for the recorder: a Web Audio
 * graph with one gain node per source, all into one `MediaStreamAudioDestinationNode`.
 * The mix is never connected to the speakers, so recording adds no echo.
 */
export interface AudioMixer {
  /** The mixed audio, one track. */
  readonly stream: MediaStream;
  /**
   * Sets or replaces the source under `key`. A stream without live audio tracks removes
   * it. The same stream again changes nothing but the gain.
   */
  setSource(key: string, stream: MediaStream | null, gain: number): void;
  /** Removes every source whose key is not in `keys`. */
  keepOnly(keys: ReadonlySet<string>): void;
  /** Starts the context if the browser left it suspended. */
  resume(): Promise<void>;
  close(): Promise<void>;
}

interface Source {
  readonly signature: string;
  readonly node: MediaStreamAudioSourceNode;
  readonly gain: GainNode;
}

function liveAudioTracks(stream: MediaStream): MediaStreamTrack[] {
  return stream.getAudioTracks().filter((track) => track.readyState === "live");
}

/** Changes when a track is added, replaced or ends, so a rebound element is noticed. */
function signatureOf(tracks: readonly MediaStreamTrack[]): string {
  return tracks.map((track) => track.id).join(",");
}

export function createAudioMixer(): AudioMixer {
  const context = new AudioContext({ latencyHint: "playback" });
  const destination = context.createMediaStreamDestination();
  const sources = new Map<string, Source>();

  const remove = (key: string): void => {
    const source = sources.get(key);
    if (source === undefined) return;
    sources.delete(key);
    source.node.disconnect();
    source.gain.disconnect();
  };

  return {
    stream: destination.stream,
    setSource: (key, stream, gainValue) => {
      const tracks = stream === null ? [] : liveAudioTracks(stream);
      if (tracks.length === 0) {
        remove(key);
        return;
      }
      const signature = signatureOf(tracks);
      const existing = sources.get(key);
      if (existing !== undefined && existing.signature === signature) {
        existing.gain.gain.value = gainValue;
        return;
      }
      remove(key);
      // A copy holding only the audio tracks, so the video of the same element is untouched.
      const node = context.createMediaStreamSource(new MediaStream(tracks));
      const gain = context.createGain();
      gain.gain.value = gainValue;
      node.connect(gain);
      gain.connect(destination);
      sources.set(key, { signature, node, gain });
    },
    keepOnly: (keys) => {
      for (const key of [...sources.keys()]) if (!keys.has(key)) remove(key);
    },
    resume: async () => {
      if (context.state === "suspended") await context.resume().catch(() => undefined);
    },
    close: async () => {
      for (const key of [...sources.keys()]) remove(key);
      for (const track of destination.stream.getTracks()) track.stop();
      await context.close().catch(() => undefined);
    },
  };
}
