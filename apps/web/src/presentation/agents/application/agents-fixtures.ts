// TJ-ARCH-MOB-001 compliant
// Static fixtures for the agents screen (agents.html CONFIG, ACTIVITY, MEMORIES,
// VOICES), built on the shared sample workspace. Fictional data; no network.
import { formatRelativeDay } from "../../workspace/application/format";
import type { AgentId, Workspace } from "../../workspace/domain/workspace";
import type {
  AgentConfig,
  DispatchRecord,
  DotMemory,
  IrisSettings,
  IrisVoice,
  RegistryAgent,
} from "../domain/agent-config";
import type { RegistrationDraft } from "../domain/registration";

const CONFIG: Readonly<Record<AgentId, AgentConfig>> = {
  concierge: {
    project: "managed",
    media: "speak",
    knowledge: "shared",
    dispatch: "system",
    autoJoin: "always",
  },
  scribe: {
    project: "managed",
    media: "listen",
    knowledge: "shared",
    dispatch: "anyone",
    autoJoin: "mine",
  },
  researcher: {
    project: "managed",
    media: "speak",
    knowledge: "files",
    dispatch: "me",
    autoJoin: "never",
  },
  facilitator: {
    project: "managed",
    media: "speak",
    knowledge: "shared",
    dispatch: "anyone",
    autoJoin: "tagged",
    tag: "workshop",
  },
  translator: {
    project: "own",
    url: "wss://lumenlabs-voice.livekit.cloud",
    media: "speak",
    knowledge: "shared",
    dispatch: "me",
    autoJoin: "never",
  },
};

export const MEMORIES: readonly DotMemory[] = [
  {
    id: "m-1014",
    meeting: "Partner onboarding review",
    date: "2026-10-14T16:46:00",
    text: "Marcus owns the partner API checklist; you offered to review it before Friday.",
  },
  {
    id: "m-1012",
    meeting: "Weekly product sync",
    date: "2026-10-12T10:30:00",
    text: "Pricing review moved to later this week; Avery will bring two options.",
  },
  {
    id: "m-1009",
    meeting: "Design critique",
    date: "2026-10-09T11:31:00",
    text: "You preferred the grid layout for recordings; Dana is sharing revised mocks.",
  },
  {
    id: "m-1002",
    meeting: "Vendor security call",
    date: "2026-10-02T16:22:00",
    text: "You asked to revisit data-retention terms before signing anything.",
  },
];

export const VOICES: readonly { readonly value: IrisVoice; readonly label: string }[] = [
  { value: "warm", label: "Warm (default)" },
  { value: "calm", label: "Calm" },
  { value: "bright", label: "Bright" },
  { value: "low", label: "Low" },
];

export const IRIS_DEFAULTS: IrisSettings = {
  name: "Iris",
  voice: "warm",
  join: "always",
  speak: "asked",
  scope: { summaries: true, conversations: true, files: false },
  paused: false,
  byDefault: true,
};

/** The registry: workspace agents with their configuration, plus agents registered this visit. */
export function buildRegistry(
  workspace: Workspace,
  added: readonly RegistryAgent[],
  removed: ReadonlySet<string>,
): readonly RegistryAgent[] {
  const base = workspace.agents.map(
    (agent): RegistryAgent => ({ ...agent, ...CONFIG[agent.id], paused: false }),
  );
  return [...base, ...added].filter((agent) => !removed.has(agent.id));
}

/** Recent dispatches per agent; the live meeting comes from the workspace. */
export function activityFor(agentId: string, workspace: Workspace): readonly DispatchRecord[] {
  const liveStart = workspace.meetings.find((m) => m.id === "partner-onboarding")?.start ?? "";
  const live: DispatchRecord = {
    meeting: "Partner onboarding review",
    date: liveStart,
    min: null,
    outcome: "live",
  };
  const table: Readonly<Record<string, readonly DispatchRecord[]>> = {
    concierge: [
      live,
      {
        meeting: "Partner onboarding review",
        date: "2026-10-14T16:00:00",
        min: 46,
        outcome: "done",
      },
      { meeting: "Design critique", date: "2026-10-09T11:00:00", min: 31, outcome: "done" },
      { meeting: "Vendor security call", date: "2026-10-02T15:30:00", min: 52, outcome: "done" },
    ],
    scribe: [
      live,
      {
        meeting: "Partner onboarding review",
        date: "2026-10-14T16:00:00",
        min: 46,
        outcome: "done",
      },
      { meeting: "Design critique", date: "2026-10-09T11:00:00", min: 31, outcome: "done" },
    ],
    researcher: [
      live,
      {
        meeting: "Partner onboarding review",
        date: "2026-10-14T16:00:00",
        min: 38,
        outcome: "done",
      },
      { meeting: "Vendor security call", date: "2026-10-02T15:30:00", min: 52, outcome: "done" },
    ],
    facilitator: [
      { meeting: "Weekly product sync", date: "2026-10-12T10:00:00", min: 28, outcome: "done" },
      { meeting: "Weekly product sync", date: "2026-10-05T10:00:00", min: 30, outcome: "done" },
    ],
    translator: [
      { meeting: "Weekly product sync", date: "2026-10-12T10:00:00", min: 0, outcome: "failed" },
      { meeting: "Design critique", date: "2026-10-09T11:00:00", min: 24, outcome: "done" },
    ],
  };
  return table[agentId] ?? [];
}

export function lastDispatchedText(records: readonly DispatchRecord[], now: Date): string {
  const latest = records[0];
  if (latest === undefined) return "Not dispatched yet";
  if (latest.outcome === "live") return "In a meeting now";
  return `Last dispatched ${formatRelativeDay(latest.date, now)}`;
}

/** The registry entry a successful connection test creates (agents.html `sanitizeAdded`). */
export function agentFromDraft(draft: RegistrationDraft, owner: string): RegistryAgent {
  const worker = draft.agentName.trim();
  return {
    id: worker,
    worker,
    name: draft.name.trim() || worker,
    role: draft.role.trim(),
    desc: draft.desc.trim(),
    mono: draft.glyph.toUpperCase() || "AG",
    system: false,
    status: "online",
    owner,
    project: draft.project,
    url: draft.project === "own" ? draft.url.trim() : undefined,
    media: draft.media,
    knowledge: draft.knowledge,
    dispatch: draft.dispatch,
    autoJoin: draft.autoJoin,
    tag: draft.tag.trim(),
    paused: false,
  };
}

/** The minimal Python worker shown on step 2 (env var names only, never values). */
export function workerSnippet(draft: RegistrationDraft, managedUrl: string): string {
  const name = draft.agentName.trim() || "your-agent-name";
  const url =
    draft.project === "own" ? draft.url.trim() || "wss://<your-project>.livekit.cloud" : managedUrl;
  const display = (draft.name.trim() || "a helpful meeting agent").replace(/["\\]/g, "");
  return [
    "# worker.py — minimal LiveKit Agents worker for KnowMe",
    "# Environment (names only — never commit the values):",
    `#   LIVEKIT_URL=${url}`,
    "#   LIVEKIT_API_KEY",
    "#   LIVEKIT_API_SECRET",
    "from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli",
    "",
    "",
    "async def entrypoint(ctx: JobContext):",
    "    await ctx.connect()",
    "    session = AgentSession()  # add your STT, LLM and TTS (or a realtime model)",
    `    await session.start(room=ctx.room, agent=Agent(instructions="You are ${display}."))`,
    "",
    "",
    'if __name__ == "__main__":',
    "    cli.run_app(WorkerOptions(",
    "        entrypoint_fnc=entrypoint,",
    `        agent_name="${name}",  # explicit dispatch: KnowMe calls this name`,
    "    ))",
  ].join("\n");
}
