/**
 * `window.__spike` (contract.md §5). `snapshot()` reads the normalised transcript projection that
 * the durable store is fed from, not React or assistant-ui state. Harness types are imported by
 * relative path, as the contract allows (types only).
 */
import type { RenderCounts, SnapshotA2uiSurface, SpikeProbe, SpikeSnapshot } from "../../../harness/src/domain/spike-probe.ts";
import type { TranscriptProjector } from "../domain/transcript/projector.ts";
import type { DurableStore } from "./ports.ts";

export interface SurfaceReader {
  surfaces(): readonly SnapshotA2uiSurface[];
}

export class RenderCounter {
  commits = 0;
  readonly byComponent: Record<string, number> = {};

  component(name: string): void {
    this.byComponent[name] = (this.byComponent[name] ?? 0) + 1;
  }

  reset(): void {
    this.commits = 0;
    for (const key of Object.keys(this.byComponent)) delete this.byComponent[key];
  }
}

export function snapshotOf(p: TranscriptProjector, surfaces: SurfaceReader): SpikeSnapshot {
  return {
    threadId: p.threadId,
    runStatus: p.run.status,
    ...(p.run.errorCode === undefined ? {} : { runErrorCode: p.run.errorCode }),
    messages: [...p.messages.values()].map((m) => ({ id: m.id, role: m.role, text: m.text, status: m.status })),
    toolCalls: [...p.toolCalls.values()].map((t) => ({
      id: t.id, name: t.name, args: t.args, status: t.status,
      ...(t.result === undefined ? {} : { result: t.result }),
      ...(t.parentMessageId === undefined ? {} : { parentMessageId: t.parentMessageId }),
    })),
    interrupts: [...p.interrupts.values()].map((i) => ({
      id: i.id, reason: i.reason, status: i.status, ...(i.toolCallId === undefined ? {} : { toolCallId: i.toolCallId }),
    })),
    state: p.state,
    customParts: p.customParts.map((c) => ({ name: c.name, rendering: c.rendering, ...(c.partId === undefined ? {} : { partId: c.partId }) })),
    a2uiSurfaces: surfaces.surfaces(),
    activities: [...p.activities.values()].map((a) => ({ messageId: a.messageId, activityType: a.activityType })),
    steps: [...p.steps.values()],
    subagents: [...p.subagents.values()],
    protocolErrors: [...p.protocolErrors],
  };
}

export interface ProbeDeps {
  readonly projector: TranscriptProjector;
  readonly store: DurableStore;
  readonly surfaces: SurfaceReader;
  readonly renders: RenderCounter;
}

export interface MutableProbe extends SpikeProbe {
  ready: boolean;
}

export function createProbe(deps: ProbeDeps): MutableProbe {
  return {
    contractVersion: 1,
    prototype: "hybrid",
    ready: false,
    snapshot: () => snapshotOf(deps.projector, deps.surfaces),
    renderCounts: (): RenderCounts => ({
      commits: deps.renders.commits,
      byComponent: { ...deps.renders.byComponent },
      storeCommits: deps.store.commits(),
    }),
    resetRenderCounts: () => {
      deps.renders.reset();
      deps.store.resetCommits();
    },
    storeSnapshot: () => deps.store.dump(),
  };
}
