// Browser-local PCM. Never fetches, records files or plays input.
class KnowMeetLocalSpeechPcm extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const requestedSize = options.processorOptions?.samplesPerChunk;
    const size =
      Number.isInteger(requestedSize) && requestedSize === 64_000 ? requestedSize : 64_000;
    this.buffer = new Float32Array(size);
    this.filled = 0;
    this.firstFrame = null;
    this.dropped = null;
    this.firstSample = 0;
    this.awaitingAck = false;
    this.hasSignal = false;
    this.port.onmessage = ({ data }) => {
      if (data !== "ack") return;
      this.awaitingAck = false;
      if (this.dropped !== null) {
        this.port.postMessage({ gap: this.dropped });
        this.dropped = null;
      }
    };
  }

  process(inputs) {
    const source = inputs[0]?.[0];
    if (!source) return true;
    this.firstFrame ??= currentFrame;
    for (let i = 0; i < source.length; i += 1) {
      const sample = source[i];
      if (this.filled === 0) this.firstSample = currentFrame - this.firstFrame + i;
      this.buffer[this.filled] = sample;
      this.filled += 1;
      this.hasSignal ||= sample !== 0;
      if (this.filled === this.buffer.length) {
        if (!this.awaitingAck) {
          this.awaitingAck = true;
          if (this.hasSignal) {
            const pcm = this.buffer;
            this.port.postMessage({ offset: this.firstSample, pcm }, [pcm.buffer]);
            this.buffer = new Float32Array(64_000);
          } else {
            this.port.postMessage({
              silence: { start: this.firstSample, end: this.firstSample + this.buffer.length },
            });
          }
        } else {
          if (this.hasSignal)
            this.dropped = {
              start: this.dropped?.start ?? this.firstSample,
              end: this.firstSample + this.buffer.length,
            };
          this.buffer.fill(0);
        }
        this.filled = 0;
        this.hasSignal = false;
      }
    }
    return true;
  }
}
registerProcessor("know-meet-local-speech-pcm", KnowMeetLocalSpeechPcm);
