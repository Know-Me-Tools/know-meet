/**
 * What the presentation layer may use: the ChatSession port, the durable read model, the live
 * announcer, the A2UI surface source and the media allowlist. Infrastructure provides the values.
 */
import { createContext, use, useCallback, useSyncExternalStore } from "react";
import type { ReactCatalogComponent } from "@a2ui/react";
import type { SurfaceModel } from "@a2ui/web_core/v1_0";
import type { ChatSession, SessionReadModel } from "../application/ports.ts";
import type { RenderCounter } from "../application/spike-probe.ts";

export interface A2uiSurfaceSource {
  subscribe(listener: () => void): () => void;
  snapshotVersion(): number;
  surfaces(): readonly { readonly surfaceId: string; readonly model: SurfaceModel<ReactCatalogComponent> | null; readonly deleted: boolean }[];
}

export interface LiveAnnouncements {
  current(): string;
  subscribe(listener: (text: string) => void): () => void;
}

export interface SessionServices {
  readonly read: SessionReadModel;
  readonly announcements: LiveAnnouncements;
  readonly surfaces: A2uiSurfaceSource;
  readonly allowedMediaOrigins: readonly string[];
  readonly renders: RenderCounter;
  readonly composerRef: { current: HTMLTextAreaElement | null };
}

export const SessionServicesContext = createContext<SessionServices | null>(null);
export const ChatSessionContext = createContext<ChatSession | null>(null);

export function useServices(): SessionServices {
  const value = use(SessionServicesContext);
  if (value === null) throw new Error("SessionServicesContext is missing");
  return value;
}

export function useChatSession(): ChatSession {
  const value = use(ChatSessionContext);
  if (value === null) throw new Error("ChatSessionContext is missing");
  return value;
}

/** Subscribes to the durable read model; re-renders only when the selected value changes. */
export function useSessionRead<T>(select: (read: SessionReadModel) => T): T {
  const { read } = useServices();
  const getSnapshot = useCallback(() => select(read), [read, select]);
  return useSyncExternalStore(read.subscribe.bind(read), getSnapshot, getSnapshot);
}

/** Focus the composer when the focused element was removed (never steals focus otherwise). */
export function restoreFocusIfLost(services: SessionServices): void {
  requestAnimationFrame(() => {
    if (document.activeElement === null || document.activeElement === document.body) services.composerRef.current?.focus();
  });
}
