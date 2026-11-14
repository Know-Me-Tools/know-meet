import type { Theme } from "../support/inventory.ts";

/** One captured prototype baseline image. */
export interface BaselineRecord {
  readonly stateId: string;
  readonly theme: Theme;
  readonly viewport: number;
  /** Relative to tests/fidelity/baselines. */
  readonly path: string;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  /** Repo-relative design source the state renders from. */
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly url: string;
  readonly method: string;
  readonly region: string;
}

export interface SkippedRecord {
  readonly stateId: string;
  readonly theme: Theme;
  readonly viewport: number;
  readonly disposition: "not-applicable" | "unreachable" | "capture-failed";
  readonly reason: string;
}

export interface ReferenceRecord {
  readonly referenceId: string;
  readonly theme: Theme;
  readonly viewport: number;
  readonly path: string;
  readonly sha256: string;
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly method: string;
  /** Reference baselines are adjudicated by design-lead, never threshold-gated. */
  readonly gating: false;
}

export interface TreeDigest {
  readonly path: string;
  /** sha256 over "<path>\0<sha256>\n" of every file, sorted (support/digests.ts). */
  readonly digest: string;
  readonly files: number;
}

export interface BaselineManifest {
  readonly schema: "know-meet-baselines/v1";
  readonly capturedAt: string;
  readonly capturedBy: string;
  readonly change: "c03-value-scenarios-and-baselines";
  readonly git: { readonly head: string; readonly designTreeStatus: string };
  readonly inventory: { readonly path: string; readonly sha256: string; readonly version: string };
  /** Design reference the set was captured from, with content digests of each tree. */
  readonly referenceRevision: {
    readonly revision: string;
    readonly decidedAt: string;
    readonly changeLog: string;
    readonly prototype: TreeDigest;
    readonly live: TreeDigest;
    readonly archivedV1: TreeDigest;
  };
  /** The set this one replaces (kept, never deleted). */
  readonly previousBaselineSet: { readonly path: string; readonly baselineSetDigest: string };
  readonly tokens: { readonly path: string; readonly sha256: string };
  readonly sharedSources: ReadonlyArray<{ readonly path: string; readonly sha256: string }>;
  readonly fonts: ReadonlyArray<{ readonly path: string; readonly sha256: string }>;
  readonly environment: Readonly<Record<string, unknown>>;
  readonly counts: {
    readonly inScopeStates: number;
    /** inScopeStates x themes x viewports. */
    readonly matrixCells: number;
    /** matrixCells minus not-applicable cells. */
    readonly expectedCaptures: number;
    readonly captured: number;
    readonly notApplicable: number;
    readonly unreachable: number;
    readonly failed: number;
    readonly reference: number;
  };
  /** sha256 over every baseline "<path>\0<sha256>\n" in path order: the baseline digest key. */
  readonly baselineSetDigest: string;
  readonly baselines: readonly BaselineRecord[];
  readonly skipped: readonly SkippedRecord[];
  readonly reference: readonly ReferenceRecord[];
  readonly blockedRequests: readonly string[];
  /** Uncaught page errors seen while capturing (the prototype's own). */
  readonly pageErrors: ReadonlyArray<{ readonly capture: string; readonly message: string }>;
}
