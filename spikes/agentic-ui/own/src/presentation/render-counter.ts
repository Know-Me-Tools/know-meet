/** React Profiler commit counts and per-component render counts for the probe. */
import type { ProfilerOnRenderCallback } from "react";

const counts = { commits: 0, byComponent: new Map<string, number>() };

export const onTranscriptRender: ProfilerOnRenderCallback = () => {
  counts.commits += 1;
};

/** Call during render of an instrumented component. */
export function countRender(name: string): void {
  counts.byComponent.set(name, (counts.byComponent.get(name) ?? 0) + 1);
}

export function readRenderCounts(): { commits: number; byComponent: Record<string, number> } {
  return { commits: counts.commits, byComponent: Object.fromEntries(counts.byComponent) };
}

export function resetRenderCounts(): void {
  counts.commits = 0;
  counts.byComponent.clear();
}
