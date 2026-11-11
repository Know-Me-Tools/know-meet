/** Typed client for the mock server's JSON endpoints. */
import type { GoldenSurfaceFile } from "../../src/domain/a2ui-surface.ts";
import type { HostileCorpusFile } from "../../src/domain/hostile.ts";
import type { ScenarioFile } from "../../src/domain/scenario.ts";
import type { Origins } from "../../src/shared/placeholders.ts";
import type { HitRecord, SessionLog, SessionSummary } from "../../src/server/session-log.ts";
import { HARNESS_URL } from "./env.ts";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${HARNESS_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}: ${await res.text()}`);
  const body: T = (await res.json()) as T;
  return body;
}

export interface Health {
  readonly ok: boolean;
  readonly origins: Origins;
  readonly versions: Readonly<Record<string, string | number>>;
}

export const harnessApi = {
  health: (): Promise<Health> => getJson<Health>("/healthz"),
  /** Scenario with origin placeholders resolved (ids may contain "/"). */
  scenario: async (id: string): Promise<ScenarioFile> => (await getJson<{ scenario: ScenarioFile }>(`/scenarios/${encodeURI(id)}`)).scenario,
  surface: (id: string): Promise<GoldenSurfaceFile> => getJson<GoldenSurfaceFile>(`/a2ui/surfaces/${encodeURIComponent(id)}`),
  hostile: (): Promise<HostileCorpusFile> => getJson<HostileCorpusFile>("/hostile"),
  session: async (id: string): Promise<{ log: SessionLog; summary: SessionSummary } | null> => {
    const res = await fetch(`${HARNESS_URL}/sessions/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GET /sessions/${id} -> ${res.status}`);
    return (await res.json()) as { log: SessionLog; summary: SessionSummary };
  },
  hits: (sinceMs: number): Promise<{ allowedMedia: HitRecord[]; evil: HitRecord[] }> =>
    getJson<{ allowedMedia: HitRecord[]; evil: HitRecord[] }>(`/hits?since=${sinceMs}`),
};

/** Request count for a session (0 before the first request). */
export async function requestCount(sessionId: string): Promise<number> {
  return (await harnessApi.session(sessionId))?.summary.requestCount ?? 0;
}
