// TJ-ARCH-MOB-001 compliant
// External store for the current width class. A crossing commits inside the
// nav morph (nav-morph.ts) with flushSync, so React writes the new layout during
// the View Transition update callback. The class is re-read at commit time, so a
// skipped transition whose callback runs late can never apply a stale class.
import { flushSync } from "react-dom";
import { createNavMorph } from "./nav-morph";
import { createWidthClassQueries, type WidthClass, widthClassOf } from "./width-class";

export interface WidthClassStore {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => WidthClass;
}

export function createWidthClassStore(view: Window): WidthClassStore {
  const queries = createWidthClassQueries(view);
  const morph = createNavMorph(view);
  const listeners = new Set<() => void>();
  let current = widthClassOf(queries);

  const commit = () => {
    current = widthClassOf(queries);
    flushSync(() => {
      for (const listener of listeners) listener();
    });
  };
  const onChange = () => {
    if (widthClassOf(queries) !== current) morph.run(commit);
  };
  queries.medium.addEventListener("change", onChange);
  queries.expanded.addEventListener("change", onChange);

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => current,
  };
}
