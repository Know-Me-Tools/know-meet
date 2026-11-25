// TJ-ARCH-MOB-001 compliant
import type { RealtimeRoom, RecordingCapturePolicy } from "@know-meet/application";
import {
  conferencingErrors,
  err,
  ok,
  type RecorderFailed,
  type RecorderFailureReason,
  type RecordingRequestId,
  type Result,
} from "@know-meet/domain";
import { type CompositePipeline, createCompositePipeline } from "./composite-pipeline";
import type { RecordingIndexWriter } from "./library-types";
import type { CaptureMicrophone } from "./local-microphone";
import { MIN_FREE_BYTES, RECORDER_TIMESLICE_MS, recordingLockName } from "./recording-constants";
import { assessRecordingMedia } from "./recording-playability";
import type { ChosenFormat } from "./recording-support";
import { openRecordingFile } from "./store/recording-files";
import type { RecordingWriter } from "./writer/opfs-writer-client";

interface SessionOptions {
  readonly id: RecordingRequestId;
  readonly capture: RecordingCapturePolicy | undefined;
  readonly room: RealtimeRoom;
  readonly roomCode: string | null;
  readonly index: RecordingIndexWriter;
  readonly now: () => number;
  readonly freeBytes: () => Promise<number | null>;
  readonly createWriter: () => RecordingWriter;
  readonly captureMicrophone: CaptureMicrophone;
  readonly format: ChosenFormat;
  readonly onCutoff: () => void;
  readonly onSaved: () => void;
  readonly onFailure: (reason: RecorderFailureReason) => void;
}

// Leave scheduling headroom inside the three-timeslice detection bound.
const STALL_TIMEOUT_MS = 2.75 * RECORDER_TIMESLICE_MS;

type RecordingResult = Result<void, RecorderFailed>;
const failed = (reason: RecorderFailureReason): RecordingResult =>
  err(conferencingErrors.recorderFailed(reason));

/** Owns one request from preflight through saving. No callback looks up the current room or recorder. */
export class RecordingSession {
  readonly id: RecordingRequestId;
  private readonly fileName: string;
  private readonly options: SessionOptions;
  private setup: Promise<RecordingResult> | null = null;
  private writer: RecordingWriter | null = null;
  private pipeline: CompositePipeline | null = null;
  private chunks = Promise.resolve();
  private readonly abort = (): void => {
    void this.stop();
  };
  private stopListening: (() => void) | undefined;
  private cutoffAt: number | null = null;
  private completion: Promise<RecordingResult> | null = null;
  private failure: RecorderFailureReason | null = null;
  private indexed = false;
  private captureStartedAt: number | null = null;
  private captureMs: number | undefined;
  private receivedMedia = false;
  private stallTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: SessionOptions) {
    this.options = options;
    this.id = options.id;
    this.fileName = `${this.id}.${options.format.extension}`;
  }

  prepare(): Promise<RecordingResult> {
    this.options.capture?.signal.addEventListener("abort", this.abort, { once: true });
    this.setup = this.initialize();
    return this.setup;
  }

  start(): RecordingResult {
    if (this.pipeline === null || this.cutoffAt !== null) return failed(this.failure ?? "failed");
    try {
      this.pipeline.startCapture();
      this.captureStartedAt = performance.now();
      return ok(undefined);
    } catch {
      return this.fail("failed");
    }
  }

  private async initialize(): Promise<RecordingResult> {
    const { capture, captureMicrophone, format, index, room, roomCode } = this.options;
    try {
      const free = await this.options.freeBytes();
      if (this.cutoffAt !== null) return failed("failed");
      if (free !== null && free < MIN_FREE_BYTES) return this.fail("quota-exceeded");
      const writer = this.options.createWriter();
      this.writer = writer;
      const opened = await writer.open(this.fileName, recordingLockName(this.id));
      if (!opened.ok) return this.fail(opened.error.reason);
      this.stopListening = writer.onFailed((reason) => this.fail(reason));
      await index.begin({
        id: this.id,
        roomCode,
        fileName: this.fileName,
        mimeType: format.mimeType,
        startedAt: this.cutoffAt ?? this.options.now(),
      });
      this.indexed = true;
      if (this.cutoffAt !== null) return failed(this.failure ?? "failed");
      this.pipeline = createCompositePipeline({
        room,
        format,
        capture,
        captureMicrophone,
        onChunk: (chunk) => {
          if (this.captureStartedAt !== null) this.receivedMedia = true;
          if (this.captureStartedAt !== null && this.cutoffAt === null) {
            clearTimeout(this.stallTimer);
            this.stallTimer = setTimeout(() => this.fail("failed"), STALL_TIMEOUT_MS);
          }
          this.chunks = this.chunks
            .then(async () => writer.append(await chunk.arrayBuffer()))
            .catch(() => {
              this.fail("failed");
            });
        },
        onError: () => {
          this.fail("failed");
        },
      });
      await this.pipeline.prepare();
      if (this.cutoffAt !== null) return failed(this.failure ?? "failed");
      const nativeStarted = await this.pipeline.startEncoder();
      if (this.cutoffAt !== null) return failed(this.failure ?? "failed");
      if (!nativeStarted) return this.fail("failed");
      return ok(undefined);
    } catch {
      return this.fail("failed");
    }
  }

  private fail(reason: RecorderFailureReason): RecordingResult {
    if (this.failure === null) {
      this.failure = reason;
      void this.stop();
      this.options.onFailure(reason);
    }
    return failed(this.failure);
  }

  stop(): Promise<RecordingResult> {
    if (this.completion !== null) return this.completion;
    this.cutoffAt = this.options.now();
    if (this.captureStartedAt !== null) this.captureMs = performance.now() - this.captureStartedAt;
    clearTimeout(this.stallTimer);
    this.options.capture?.signal.removeEventListener("abort", this.abort);
    this.options.onCutoff();
    // Install the completion before finish(): a synchronous encoder error may re-enter stop.
    let drained: Promise<void> | undefined;
    this.completion = Promise.resolve().then(() => this.save(drained));
    drained = this.pipeline?.finish();
    return this.completion;
  }

  private async save(drained: Promise<void> | undefined): Promise<RecordingResult> {
    try {
      await this.setup;
      await drained;
      if (this.captureStartedAt !== null && !this.receivedMedia) this.fail("failed");
      await this.chunks;
      const reportedSize = (await this.writer?.close()) ?? 0;
      if (this.indexed) await this.indexResult(reportedSize);
    } catch {
      return this.fail("failed");
    } finally {
      this.stopListening?.();
      this.options.onSaved();
    }
    return this.failure === null ? ok(undefined) : failed(this.failure);
  }

  private async indexResult(reportedSize: number): Promise<void> {
    const file = await openRecordingFile(this.fileName);
    const sizeBytes = file?.size ?? reportedSize;
    const media =
      this.captureStartedAt === null || file === null || sizeBytes === 0
        ? "unusable"
        : await assessRecordingMedia(
            file,
            this.options.format.mimeType,
            this.captureMs,
            this.pipeline?.videoProgress(),
          );
    // A canceled startup never admitted live sources and has no playable meeting clip.
    if (this.captureStartedAt !== null && media !== "playable") this.fail("failed");
    const endReason =
      media === "unusable"
        ? "unusable"
        : this.failure === "quota-exceeded"
          ? "storage-full"
          : this.failure !== null || media === "partial"
            ? "failed"
            : "stopped";
    await this.options.index.finish({
      id: this.id,
      endedAt: this.cutoffAt ?? this.options.now(),
      sizeBytes,
      endReason,
    });
  }
}
