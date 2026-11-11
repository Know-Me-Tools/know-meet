/** Per-surface UI state shared by the catalog components (validation display, tabs, modals). */
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import type { ReactNode as Node } from "react";

export interface SurfaceUi {
  readonly surfaceId: string;
  readonly allowMediaOrigins: readonly string[];
  /** True after the user activated a Button whose checks failed: fields then show their messages. */
  readonly submitAttempted: boolean;
  markSubmitAttempted(): void;
  setActiveTab(componentId: string, index: number): void;
  setModalOpen(componentId: string, open: boolean): void;
}

const SurfaceUiContext = createContext<SurfaceUi | null>(null);

export interface SurfaceUiProviderProps {
  readonly surfaceId: string;
  readonly allowMediaOrigins: readonly string[];
  readonly onTab: (surfaceId: string, componentId: string, index: number) => void;
  readonly onModal: (surfaceId: string, componentId: string, open: boolean) => void;
  readonly children: ReactNode;
}

export function SurfaceUiProvider({ surfaceId, allowMediaOrigins, onTab, onModal, children }: SurfaceUiProviderProps) {
  const [submitAttempted, setAttempted] = useState(false);
  const markSubmitAttempted = useCallback(() => setAttempted(true), []);
  const value = useMemo<SurfaceUi>(
    () => ({
      surfaceId,
      allowMediaOrigins,
      submitAttempted,
      markSubmitAttempted,
      setActiveTab: (componentId, index) => onTab(surfaceId, componentId, index),
      setModalOpen: (componentId, open) => onModal(surfaceId, componentId, open),
    }),
    [surfaceId, allowMediaOrigins, submitAttempted, markSubmitAttempted, onTab, onModal],
  );
  return <SurfaceUiContext value={value}>{children}</SurfaceUiContext>;
}

export function useSurfaceUi(): SurfaceUi {
  const ui = use(SurfaceUiContext);
  if (ui === null) throw new Error("SurfaceUiProvider is missing");
  return ui;
}

export type ChildRef = string | { readonly id: string; readonly basePath: string };

/** Renders resolved child references (plain ids or template instances). */
export function renderChildren(children: readonly ChildRef[] | undefined, buildChild: (id: string, basePath?: string) => Node): Node[] {
  return (children ?? []).map((c) =>
    typeof c === "string" ? <ChildSlot key={c}>{buildChild(c)}</ChildSlot> : <ChildSlot key={`${c.id}@${c.basePath}`}>{buildChild(c.id, c.basePath)}</ChildSlot>,
  );
}

function ChildSlot({ children }: { readonly children: Node }) {
  return <>{children}</>;
}

export function errorsOf(isValid: unknown, validationErrors: unknown): readonly string[] {
  if (isValid !== false || !Array.isArray(validationErrors)) return [];
  return validationErrors.filter((e): e is string => typeof e === "string");
}
