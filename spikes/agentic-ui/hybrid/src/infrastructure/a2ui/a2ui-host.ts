/**
 * A2UI host: one @a2ui/web_core MessageProcessor fed from the journal's `a2ui-surface` activity
 * events (ACTIVITY_SNAPSHOT / ACTIVITY_DELTA, `content.a2ui_operations`), rendered by @a2ui/react
 * with the Know Meet catalog.
 *
 * Why not assistant-ui's own A2UI path: @assistant-ui/react-ag-ui converts a surface into its
 * generative-UI tree (`convertSurfaceToUISpec`). That converter supports 15 component types (no
 * Video, AudioPlayer or Modal), drops unknown components instead of rendering a fallback, strips
 * component ids and does not run `checks`, so it cannot render the harness surfaces. The live
 * runtime still owns the run; the surfaces render from this host.
 */
import { MessageProcessor, type ActionPayload, type SurfaceModel } from "@a2ui/web_core/v1_0";
import type { ReactCatalogComponent } from "@a2ui/react";
import type { WireEvent } from "../../domain/event-guard.ts";

export const A2UI_ACTIVITY_TYPE = "a2ui-surface";
const OPERATIONS_KEY = "a2ui_operations";

export interface SurfaceEntry {
  readonly surfaceId: string;
  readonly model: SurfaceModel<ReactCatalogComponent> | null;
  readonly deleted: boolean;
  readonly lastDataModel: unknown;
}

type Listener = () => void;
type ActionSink = (action: ActionPayload) => void;

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export class A2uiHost {
  private readonly processor: MessageProcessor<ReactCatalogComponent>;
  private readonly applied = new Map<string, number>();
  private readonly contents = new Map<string, unknown>();
  private readonly entries = new Map<string, SurfaceEntry>();
  private readonly listeners = new Set<Listener>();
  private sink: ActionSink | null = null;
  private version = 0;
  /** A2UI processing errors (reported, never thrown), kept for diagnostics. */
  readonly errors: unknown[] = [];

  constructor(
    catalog: ConstructorParameters<typeof MessageProcessor<ReactCatalogComponent>>[0][number],
    private readonly knownComponents: ReadonlySet<string>,
    private readonly patch: (doc: unknown, ops: readonly unknown[]) => unknown,
  ) {
    this.processor = new MessageProcessor<ReactCatalogComponent>([catalog], (action) => this.sink?.(action), { reportErrorsOnly: true });
    this.processor.onSurfaceCreated((surface) => this.track(surface.id, surface, false));
    this.processor.onSurfaceDeleted((id) => {
      const prior = this.entries.get(id);
      this.track(id, null, true, prior?.model?.dataModel.get("/") ?? prior?.lastDataModel);
    });
  }

  setActionSink(sink: ActionSink): void {
    this.sink = sink;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshotVersion(): number {
    return this.version;
  }

  surfaces(): readonly SurfaceEntry[] {
    return [...this.entries.values()];
  }

  /** Feeds an accepted AG-UI event; ignores everything but a2ui-surface activity. */
  ingest(event: WireEvent): void {
    if (event.type !== "ACTIVITY_SNAPSHOT" && event.type !== "ACTIVITY_DELTA") return;
    const messageId = typeof event["messageId"] === "string" ? event["messageId"] : "a2ui";
    if (event.type === "ACTIVITY_SNAPSHOT") {
      if (event["activityType"] !== A2UI_ACTIVITY_TYPE) return;
      this.contents.set(messageId, event["content"]);
    } else {
      if (!this.contents.has(messageId)) return;
      const ops = Array.isArray(event["patch"]) ? (event["patch"] as unknown[]) : [];
      this.contents.set(messageId, this.patch(this.contents.get(messageId), ops));
    }
    this.processNew(messageId);
  }

  private processNew(messageId: string): void {
    const list = record(this.contents.get(messageId))?.[OPERATIONS_KEY];
    if (!Array.isArray(list)) return;
    const done = this.applied.get(messageId) ?? 0;
    const fresh = list.slice(done).map((op) => this.withFallbacks(op));
    this.applied.set(messageId, list.length);
    if (fresh.length === 0) return;
    // Clone: the same event objects are committed to entity-graph, whose immer store deep-freezes
    // them, while A2UI's DataModel mutates its initial value in place.
    this.errors.push(...this.processor.processMessagesWithErrors(structuredClone(fresh)));
    this.bump();
  }

  /** Unknown component types become `KmFallback` (keeping the id), so they render a neutral box. */
  private withFallbacks(op: unknown): unknown {
    const msg = record(op);
    const update = record(msg?.["updateComponents"]);
    const components = update?.["components"];
    if (msg === null || update === null || !Array.isArray(components)) return op;
    const mapped = components.map((c) => {
      const comp = record(c);
      const type = comp?.["component"];
      if (comp === null || typeof type !== "string" || this.knownComponents.has(type)) return c;
      return { id: comp["id"], component: "KmFallback", originalType: type };
    });
    return { ...msg, updateComponents: { ...update, components: mapped } };
  }

  private track(id: string, model: SurfaceModel<ReactCatalogComponent> | null, deleted: boolean, lastDataModel?: unknown): void {
    this.entries.set(id, { surfaceId: id, model, deleted, lastDataModel: lastDataModel ?? model?.dataModel.get("/") });
    this.bump();
  }

  private bump(): void {
    this.version += 1;
    for (const l of this.listeners) l();
  }
}
