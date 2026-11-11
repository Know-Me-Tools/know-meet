/**
 * The AG-UI agent handed to assistant-ui's `useAgUiRuntime`. It keeps @ag-ui/client's
 * AbstractAgent pipeline (chunk expansion, verification, apply, subscribers) but replaces the
 * transport (HttpAgent) with `streamRun`, which reconnects with Last-Event-ID and skips malformed
 * frames. Every accepted frame is also handed to the session recorder (journal + checkpoints)
 * before assistant-ui sees it.
 */
import { AbstractAgent } from "@ag-ui/client";
import type { BaseEvent, RunAgentInput } from "@ag-ui/core";
import { Observable } from "rxjs";
import type { WireEvent } from "../../domain/event-guard.ts";
import { streamRun } from "./resilient-stream.ts";

export interface RunTap {
  accepted(runId: string, frameId: string, event: WireEvent): void;
  rejected(runId: string, frameId: string, code: string, eventType: string | undefined): void;
  failed(runId: string, error: Error): void;
}

export class KmAgUiAgent extends AbstractAgent {
  private active: AbortController | null = null;

  constructor(
    private readonly endpoint: string,
    private readonly tap: RunTap,
  ) {
    super({ threadId: "km-thread" });
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((subscriber) => {
      const controller = new AbortController();
      this.active = controller;
      const runId = input.runId;
      streamRun(
        { url: this.endpoint, body: JSON.stringify(input), signal: controller.signal },
        {
          accepted: (frameId, event) => {
            this.tap.accepted(runId, frameId, event);
            subscriber.next(event as unknown as BaseEvent);
          },
          rejected: (frameId, code, eventType) => this.tap.rejected(runId, frameId, code, eventType),
        },
      ).then(
        () => subscriber.complete(),
        (error: unknown) => {
          const err = error instanceof Error ? error : new Error(String(error));
          this.tap.failed(runId, err);
          subscriber.error(err);
        },
      );
      return () => controller.abort();
    });
  }

  override abortRun(): void {
    this.active?.abort();
    this.active = null;
    super.abortRun();
  }

  override clone(): KmAgUiAgent {
    return new KmAgUiAgent(this.endpoint, this.tap);
  }
}
