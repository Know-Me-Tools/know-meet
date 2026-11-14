// TJ-ARCH-MOB-001 compliant
// meet.html `colsFor` on resize: tile columns follow the stage width. The stage
// scrolls vertically when tiles overflow; while it does and holds no focusable
// control of its own, it joins the tab order so keyboard users can scroll it
// (RV-23 focusable region; axe scrollable-region-focusable).
import { type RefObject, useLayoutEffect, useState } from "react";
import { columnsFor } from "../domain/room";

export interface StageLayout {
  readonly columns: number;
  readonly scrollable: boolean;
}

const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])";

export function useStageLayout(ref: RefObject<HTMLElement | null>, tileCount: number): StageLayout {
  const [layout, setLayout] = useState<StageLayout>({
    columns: columnsFor(tileCount, 1024),
    scrollable: false,
  });
  useLayoutEffect(() => {
    const stage = ref.current;
    if (stage === null) return undefined;
    const measure = () => {
      const width = stage.clientWidth || window.innerWidth;
      const overflows = stage.scrollHeight > stage.clientHeight + 1;
      const hasControl = stage.querySelector(FOCUSABLE) !== null;
      const next = { columns: columnsFor(tileCount, width), scrollable: overflows && !hasControl };
      setLayout((prev) =>
        prev.columns === next.columns && prev.scrollable === next.scrollable ? prev : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    const grid = stage.firstElementChild;
    if (grid !== null) observer.observe(grid);
    return () => observer.disconnect();
  }, [ref, tileCount]);
  return layout;
}
