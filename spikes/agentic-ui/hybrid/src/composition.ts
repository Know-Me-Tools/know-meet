/**
 * Composition root: wires the durable store, the session recorder, the A2UI host, the AG-UI
 * transport and the probe. Created once before the first render.
 */
import type { SnapshotA2uiSurface } from "../../harness/src/domain/spike-probe.ts";
import { readLaunchParams, runEndpoint, type LaunchParams } from "./application/launch-params.ts";
import { SessionRecorder } from "./application/session-recorder.ts";
import { createProbe, RenderCounter, type MutableProbe, type SurfaceReader } from "./application/spike-probe.ts";
import { A2uiHost } from "./infrastructure/a2ui/a2ui-host.ts";
import { EntityGraphStore, jsonPatch } from "./infrastructure/store/entity-graph-store.ts";
import { KmAgUiAgent } from "./infrastructure/transport/km-agui-agent.ts";
import { createKnowMeetCatalog } from "./presentation/a2ui-catalog/catalog.ts";

export interface App {
  readonly params: LaunchParams;
  readonly store: EntityGraphStore;
  readonly recorder: SessionRecorder;
  readonly a2ui: A2uiHost;
  readonly agent: KmAgUiAgent;
  readonly renders: RenderCounter;
  readonly probe: MutableProbe;
}

/** Rendered ids come from the DOM (what is on screen); template-stamped rows are reported via their host. */
function domSurfaceReader(host: A2uiHost): SurfaceReader {
  return {
    surfaces(): SnapshotA2uiSurface[] {
      return host.surfaces().map((entry) => {
        const root = document.querySelector(`[data-testid="km-a2ui-surface"][data-surface-id="${CSS.escape(entry.surfaceId)}"]`);
        const rendered = new Set<string>();
        const fallback = new Set<string>();
        for (const el of root?.querySelectorAll("[data-a2ui-id]") ?? []) {
          if (el.closest("[data-a2ui-template-item]") !== null) continue;
          const id = el.getAttribute("data-a2ui-id") ?? "";
          rendered.add(id);
          if (el.hasAttribute("data-a2ui-fallback")) fallback.add(id);
        }
        return {
          surfaceId: entry.surfaceId,
          renderedComponentIds: entry.deleted ? [] : [...rendered],
          fallbackComponentIds: entry.deleted ? [] : [...fallback],
          dataModel: entry.deleted ? entry.lastDataModel : entry.model?.dataModel.get("/"),
          deleted: entry.deleted,
        };
      });
    },
  };
}

export function compose(search: string): App {
  const params = readLaunchParams(search);
  const store = new EntityGraphStore();
  const recorder = new SessionRecorder(store, jsonPatch, params.allowMediaOrigins, () => performance.now());
  const { catalog, known } = createKnowMeetCatalog();
  const a2ui = new A2uiHost(catalog, known, jsonPatch);
  const agent = new KmAgUiAgent(runEndpoint(params), {
    accepted(runId, frameId, event) {
      recorder.serverEvent(runId, frameId, event);
      a2ui.ingest(event);
    },
    rejected(runId, frameId, code, eventType) {
      recorder.protocolError(runId, frameId, code, eventType);
    },
    failed(_runId, error) {
      recorder.client({ type: "client.transport-error", message: error.message });
    },
  });
  const renders = new RenderCounter();
  const probe = createProbe({ projector: recorder.projector, store, surfaces: domSurfaceReader(a2ui), renders });
  return { params, store, recorder, a2ui, agent, renders, probe };
}
