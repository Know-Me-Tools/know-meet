/** window.__spike (contract.md section 5). Installed before the first render. */
import type { SpikeProbe, SpikeSnapshot } from "../../../harness/src/domain/spike-probe.ts";
import type { AgentSession } from "../application/agent-session.ts";
import type { A2uiSurfaceHost, TranscriptStore } from "../application/ports.ts";
import { toSpikeSnapshot } from "../application/spike-snapshot.ts";
import { readRenderCounts, resetRenderCounts } from "./render-counter.ts";

export interface ProbeHandle {
  readonly probe: SpikeProbe;
  markReady(): void;
}

export function createProbe(session: AgentSession, a2ui: A2uiSurfaceHost, store: TranscriptStore): ProbeHandle {
  let ready = false;
  const probe: SpikeProbe = {
    contractVersion: 1,
    prototype: "own",
    get ready() {
      return ready;
    },
    snapshot: (): SpikeSnapshot => toSpikeSnapshot(session.current(), a2ui.snapshot()),
    // O-only diagnostics ride along with the contract fields (gate 16.1): publish
    // triggers and max lag, and O's own run start/settle marks (Date.now ms).
    renderCounts: () => ({ ...readRenderCounts(), storeCommits: store.commitCount(), publish: session.publishStats(), runTiming: session.runTiming() }),
    resetRenderCounts: () => {
      resetRenderCounts();
      store.resetCommitCount();
      session.resetDiagnostics();
    },
    storeSnapshot: () => store.snapshot(),
  };
  return {
    probe,
    markReady: () => {
      ready = true;
    },
  };
}
