// TJ-ARCH-MOB-001 compliant
// Presentation hook: the sample workspace anchored at mount time (one `now` per
// screen mount, like a prototype page load).
import { useState } from "react";
import { buildSampleWorkspace } from "./application/sample-workspace";
import type { Workspace } from "./domain/workspace";

export interface WorkspaceView {
  readonly workspace: Workspace;
  readonly now: Date;
}

export function useSampleWorkspace(): WorkspaceView {
  const [view] = useState<WorkspaceView>(() => {
    const now = new Date();
    return { workspace: buildSampleWorkspace(now), now };
  });
  return view;
}
