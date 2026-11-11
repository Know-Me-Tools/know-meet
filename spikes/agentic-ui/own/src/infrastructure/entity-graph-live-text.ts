/**
 * LiveTextOverlay on @prometheus-ags/entity-graph-core 4.4.0's render-only live layer
 * (`createLiveLayer`). Streaming text is held as a live `text` field of the KmMessage entity:
 * no graph write, no persistence, no devtools event; per-entity subscriptions. The durable text
 * still arrives through the store's boundary/checkpoint commits, so the overlay is discarded
 * (never committed) once a message stops streaming.
 */
import { createLiveLayer, type LiveLayer } from "@prometheus-ags/entity-graph-core";
import type { LiveTextOverlay } from "../application/ports.ts";
import { ENTITY } from "./entity-graph-store.ts";

const FIELD = "text";

export class EntityGraphLiveText implements LiveTextOverlay {
  private readonly layer: LiveLayer;
  private readonly held = new Set<string>();

  constructor(layer: LiveLayer = createLiveLayer()) {
    this.layer = layer;
  }

  set(id: string, text: string): void {
    this.held.add(id);
    this.layer.set(ENTITY.message, id, { [FIELD]: text });
  }

  clear(id: string): boolean {
    if (!this.held.delete(id)) return false;
    this.layer.discard(ENTITY.message, id, [FIELD]);
    return true;
  }

  get(id: string): string | undefined {
    const value = this.layer.get(ENTITY.message, id)?.[FIELD];
    return typeof value === "string" ? value : undefined;
  }

  ids(): string[] {
    return [...this.held];
  }

  subscribe(id: string, listener: () => void): () => void {
    return this.layer.subscribe(ENTITY.message, id, listener);
  }
}
