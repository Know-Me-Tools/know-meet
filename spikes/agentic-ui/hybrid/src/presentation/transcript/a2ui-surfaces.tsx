/** Renders every live A2UI surface with @a2ui/react and the Know Meet catalog. */
import { useCallback, useSyncExternalStore } from "react";
import { A2uiSurface } from "@a2ui/react";
import { A2uiMediaPolicy } from "../a2ui-catalog/props.ts";
import { useServices } from "../session-context.tsx";

export function A2uiSurfaces() {
  const { surfaces, allowedMediaOrigins, renders } = useServices();
  const subscribe = useCallback((notify: () => void) => surfaces.subscribe(notify), [surfaces]);
  useSyncExternalStore(subscribe, () => surfaces.snapshotVersion());
  renders.component("A2uiSurfaces");
  const live = surfaces.surfaces().filter((s) => !s.deleted && s.model !== null);
  if (live.length === 0) return null;
  return (
    <A2uiMediaPolicy value={allowedMediaOrigins}>
      {live.map((s) =>
        s.model === null ? null : (
          <section key={s.surfaceId} data-testid="km-a2ui-surface" data-surface-id={s.surfaceId} aria-label="Interactive card from the assistant" className="rounded-lg bg-surface p-s4">
            <A2uiSurface surface={s.model} />
          </section>
        ),
      )}
    </A2uiMediaPolicy>
  );
}
