/**
 * A2UI adapter on @a2ui/web_core 0.15.0 (v1.0 MessageProcessor). Applies the
 * A2UI operations carried in `a2ui-surface` activities (snapshot + JSON Patch
 * appends) exactly once each, rewrites component types the catalog does not
 * know to the neutral `KmFallback`, forwards user actions, and reports the
 * surfaces for the probe. Live surface state stays in web_core's signals; the
 * transcript store only holds the activity content.
 */
import { MessageProcessor, type ActionPayload, type Catalog, type ComponentApi, type SurfaceModel } from "@a2ui/web_core/v1_0";
import type { A2uiSurfaceHost, A2uiUserAction, SurfaceSnapshot } from "../application/ports.ts";
import type { TranscriptState } from "../domain/transcript-model.ts";

export const A2UI_ACTIVITY_TYPE = "a2ui-surface";
export const A2UI_OPERATIONS_KEY = "a2ui_operations";
export const FALLBACK_COMPONENT = "KmFallback";

type Op = Readonly<Record<string, unknown>>;
type Listener = () => void;

interface SurfaceRecord {
  readonly activityId: string;
  readonly fallbackIds: Set<string>;
  deleted: boolean;
  lastDataModel: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function surfaceIdOf(op: Op): string | undefined {
  for (const key of ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"]) {
    const body = op[key];
    if (isRecord(body) && typeof body["surfaceId"] === "string") return body["surfaceId"];
  }
  return undefined;
}

export class A2uiHost<T extends ComponentApi> implements A2uiSurfaceHost {
  private readonly processor: MessageProcessor<T>;
  private readonly applied = new Map<string, readonly unknown[]>();
  private readonly surfaces = new Map<string, SurfaceRecord>();
  private readonly activeTabs = new Map<string, number>();
  private readonly openModals = new Set<string>();
  private readonly listeners = new Set<Listener>();
  private readonly errors: string[] = [];
  private version = 0;

  constructor(private readonly catalog: Catalog<T>, onAction: (action: A2uiUserAction) => void) {
    this.processor = new MessageProcessor<T>([catalog], (payload: ActionPayload) => onAction(toUserAction(payload)), {
      errorHandler: (error) => this.errors.push(JSON.stringify(error)),
    });
  }

  sync(state: TranscriptState): void {
    let touched = false;
    for (const activityId of state.activityOrder) {
      const activity = state.activities[activityId];
      if (activity?.activityType !== A2UI_ACTIVITY_TYPE) continue;
      const ops = activity.content[A2UI_OPERATIONS_KEY];
      if (!Array.isArray(ops)) continue;
      const done = this.applied.get(activityId) ?? [];
      const isPrefix = done.length <= ops.length && done.every((op, i) => op === ops[i] || JSON.stringify(op) === JSON.stringify(ops[i]));
      const pending = isPrefix ? ops.slice(done.length) : ops;
      for (const op of pending) if (isRecord(op)) this.apply(activityId, op);
      if (pending.length > 0) touched = true;
      this.applied.set(activityId, [...ops]);
    }
    if (touched) this.bump();
  }

  surfacesFor(activityId: string): SurfaceModel<T>[] {
    const out: SurfaceModel<T>[] = [];
    for (const [id, record] of this.surfaces) {
      const model = record.activityId === activityId && !record.deleted ? this.processor.getSurface(id) : undefined;
      if (model !== undefined) out.push(model);
    }
    return out;
  }

  getVersion(): number {
    return this.version;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setActiveTab(surfaceId: string, componentId: string, index: number): void {
    this.activeTabs.set(`${surfaceId}/${componentId}`, index);
  }

  setModalOpen(surfaceId: string, componentId: string, open: boolean): void {
    if (open) this.openModals.add(`${surfaceId}/${componentId}`);
    else this.openModals.delete(`${surfaceId}/${componentId}`);
  }

  isFallback(surfaceId: string, componentId: string): boolean {
    return this.surfaces.get(surfaceId)?.fallbackIds.has(componentId) ?? false;
  }

  snapshot(): SurfaceSnapshot[] {
    return [...this.surfaces.entries()].map(([surfaceId, record]) => {
      const model = record.deleted ? undefined : this.processor.getSurface(surfaceId);
      if (model === undefined) {
        return { surfaceId, renderedComponentIds: [], fallbackComponentIds: [], dataModel: record.lastDataModel, deleted: record.deleted };
      }
      const rendered = this.renderedIds(model);
      return {
        surfaceId,
        renderedComponentIds: rendered,
        fallbackComponentIds: rendered.filter((id) => record.fallbackIds.has(id)),
        dataModel: model.dataModel.get("/"),
        deleted: false,
      };
    });
  }

  diagnostics(): readonly string[] {
    return this.errors;
  }

  private apply(activityId: string, raw: Op): void {
    const op = this.rewriteUnknown(structuredClone(raw) as Record<string, unknown>);
    const surfaceId = surfaceIdOf(op);
    if (surfaceId !== undefined && isRecord(op["createSurface"]) && !this.surfaces.has(surfaceId)) {
      this.surfaces.set(surfaceId, { activityId, fallbackIds: new Set(), deleted: false, lastDataModel: undefined });
    }
    const record = surfaceId === undefined ? undefined : this.surfaces.get(surfaceId);
    if (record !== undefined && isRecord(op["updateComponents"])) this.noteFallbacks(record, op["updateComponents"]);
    if (record !== undefined && isRecord(op["deleteSurface"])) {
      record.lastDataModel = this.processor.getSurface(surfaceId ?? "")?.dataModel.get("/");
      record.deleted = true;
    }
    try {
      this.processor.processMessages([op] as unknown as Parameters<MessageProcessor<T>["processMessages"]>[0]);
    } catch (thrown) {
      this.errors.push(thrown instanceof Error ? thrown.message : String(thrown));
    }
  }

  private noteFallbacks(record: SurfaceRecord, update: Record<string, unknown>): void {
    const components = update["components"];
    if (!Array.isArray(components)) return;
    for (const c of components) {
      if (!isRecord(c) || typeof c["id"] !== "string") continue;
      if (c["component"] === FALLBACK_COMPONENT) record.fallbackIds.add(c["id"]);
      else record.fallbackIds.delete(c["id"]);
    }
  }

  /** Unknown component types become KmFallback (keeping the id) so they degrade instead of vanishing. */
  private rewriteUnknown(op: Record<string, unknown>): Record<string, unknown> {
    const update = op["updateComponents"];
    if (!isRecord(update) || !Array.isArray(update["components"])) return op;
    const components = update["components"].map((c: unknown) => {
      if (!isRecord(c) || typeof c["component"] !== "string" || this.catalog.components.has(c["component"])) return c;
      return { id: c["id"], component: FALLBACK_COMPONENT, originalType: c["component"] };
    });
    return { ...op, updateComponents: { ...update, components } };
  }

  private renderedIds(model: SurfaceModel<T>): string[] {
    const ids: string[] = [];
    const seen = new Set<string>();
    const visit = (id: unknown): void => {
      if (typeof id !== "string" || seen.has(id)) return;
      const component = model.componentsModel.get(id);
      if (component === undefined) return;
      seen.add(id);
      ids.push(id);
      const props: Record<string, unknown> = component.properties;
      const key = `${model.id}/${id}`;
      if (component.type === "Tabs") {
        const tabs = Array.isArray(props["tabs"]) ? (props["tabs"] as unknown[]) : [];
        const active = tabs[this.activeTabs.get(key) ?? 0];
        if (isRecord(active)) visit(active["child"]);
        return;
      }
      if (component.type === "Modal") {
        visit(props["trigger"]);
        if (this.openModals.has(key)) visit(props["content"]);
        return;
      }
      visit(props["child"]);
      if (Array.isArray(props["children"])) for (const child of props["children"]) visit(child);
    };
    visit(model.rootId);
    return ids;
  }

  private bump(): void {
    this.version += 1;
    for (const l of this.listeners) l();
  }
}

function toUserAction(payload: ActionPayload): A2uiUserAction {
  return {
    name: payload.name,
    surfaceId: payload.surfaceId,
    sourceComponentId: payload.sourceComponentId,
    timestamp: payload.timestamp,
    context: payload.context,
  };
}
