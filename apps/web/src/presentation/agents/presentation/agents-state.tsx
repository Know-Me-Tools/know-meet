// TJ-ARCH-MOB-001 compliant
// Screen-level state for the static agents screen: agents registered or removed
// this visit, Iris's settings, the registration draft (secrets in memory only),
// and the last failed connection test. Nothing is persisted or sent anywhere
// (contract exclusion: no backend this phase). One provider at the screen root, so
// every hash sub-state (registry, wizard steps, detail, dots) shares it.
import { createContext, use, useMemo, useState } from "react";
import type * as React from "react";
import { useSessionUser } from "../../shared/session";
import type { Workspace } from "../../workspace/domain/workspace";
import { useSampleWorkspace } from "../../workspace/use-workspace";
import { buildRegistry, IRIS_DEFAULTS } from "../application/agents-fixtures";
import type { IrisSettings, RegistryAgent } from "../domain/agent-config";
import {
  EMPTY_DRAFT,
  EMPTY_SECRETS,
  type RegistrationDraft,
  type RegistrationSecrets,
} from "../domain/registration";

export interface TestFailure {
  readonly agentName: string;
  readonly url: string;
}

export interface AgentsState {
  readonly workspace: Workspace;
  readonly now: Date;
  readonly userName: string;
  readonly registry: readonly RegistryAgent[];
  readonly addAgent: (agent: RegistryAgent) => void;
  readonly removeAgent: (id: string) => void;
  readonly iris: IrisSettings;
  readonly updateIris: (patch: Partial<IrisSettings>) => void;
  readonly forgotten: ReadonlySet<string>;
  readonly forgetMemory: (id: string) => void;
  readonly draft: RegistrationDraft;
  readonly updateDraft: (patch: Partial<RegistrationDraft>) => void;
  readonly secrets: RegistrationSecrets;
  readonly updateSecrets: (patch: Partial<RegistrationSecrets>) => void;
  readonly resetDraft: () => void;
  readonly lastFailure: TestFailure | null;
  readonly setLastFailure: (failure: TestFailure | null) => void;
}

const AgentsStateContext = createContext<AgentsState | null>(null);

export function useAgentsState(): AgentsState {
  const state = use(AgentsStateContext);
  if (state === null) throw new Error("AgentsStateProvider is missing");
  return state;
}

export function AgentsStateProvider({ children }: { readonly children: React.ReactNode }) {
  const { workspace, now } = useSampleWorkspace();
  const user = useSessionUser();
  const [added, setAdded] = useState<readonly RegistryAgent[]>([]);
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set());
  const [iris, setIris] = useState<IrisSettings>(IRIS_DEFAULTS);
  const [forgotten, setForgotten] = useState<ReadonlySet<string>>(() => new Set());
  const [draft, setDraft] = useState<RegistrationDraft>(EMPTY_DRAFT);
  const [secrets, setSecrets] = useState<RegistrationSecrets>(EMPTY_SECRETS);
  const [lastFailure, setLastFailure] = useState<TestFailure | null>(null);

  const value = useMemo<AgentsState>(
    () => ({
      workspace,
      now,
      userName: user?.name ?? "You",
      registry: buildRegistry(workspace, added, removed),
      addAgent: (agent) => {
        setAdded((list) => [...list.filter((a) => a.id !== agent.id), agent]);
        setRemoved((set) => new Set([...set].filter((id) => id !== agent.id)));
      },
      removeAgent: (id) => setRemoved((set) => new Set([...set, id])),
      iris,
      updateIris: (patch) => setIris((current) => ({ ...current, ...patch })),
      forgotten,
      forgetMemory: (id) => setForgotten((set) => new Set([...set, id])),
      draft,
      updateDraft: (patch) => setDraft((current) => ({ ...current, ...patch })),
      secrets,
      updateSecrets: (patch) => setSecrets((current) => ({ ...current, ...patch })),
      resetDraft: () => {
        setDraft(EMPTY_DRAFT);
        setSecrets(EMPTY_SECRETS);
      },
      lastFailure,
      setLastFailure,
    }),
    [workspace, now, user, added, removed, iris, forgotten, draft, secrets, lastFailure],
  );

  return <AgentsStateContext value={value}>{children}</AgentsStateContext>;
}
