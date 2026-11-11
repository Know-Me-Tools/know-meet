/** Renders the A2UI surfaces an `a2ui-surface` activity created, with @a2ui/react's A2uiSurface. */
import { A2uiSurface } from "@a2ui/react";
import { useCallback } from "react";
import { useA2uiVersion, useServices } from "../session-context.tsx";
import { SurfaceUiProvider } from "./surface-ui.tsx";

export function A2uiActivityView({ activityId }: { readonly activityId: string }) {
  const { a2ui, allowMediaOrigins } = useServices();
  useA2uiVersion();
  const onTab = useCallback((s: string, c: string, i: number) => a2ui.setActiveTab(s, c, i), [a2ui]);
  const onModal = useCallback((s: string, c: string, open: boolean) => a2ui.setModalOpen(s, c, open), [a2ui]);
  const surfaces = a2ui.surfacesFor(activityId);
  if (surfaces.length === 0) return null;
  return (
    <>
      {surfaces.map((surface) => (
        <section key={surface.id} data-testid="km-a2ui-surface" data-surface-id={surface.id} aria-label="Interactive card" className="rounded-lg bg-card p-4">
          <SurfaceUiProvider surfaceId={surface.id} allowMediaOrigins={allowMediaOrigins} onTab={onTab} onModal={onModal}>
            <A2uiSurface surface={surface} />
          </SurfaceUiProvider>
        </section>
      ))}
    </>
  );
}
