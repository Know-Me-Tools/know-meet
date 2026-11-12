// TJ-ARCH-MOB-001 compliant
// Agent registry configuration vocabulary (agents.html MEDIA, KNOWLEDGE, DISPATCH,
// AUTOJOIN) and the registry view model. Labels are the prototype's copy. No
// framework imports.
import type { Agent } from "../../workspace/domain/workspace";

export type MediaMode = "speak" | "listen" | "chat";
export type KnowledgeAccess = "shared" | "files" | "none";
export type DispatchScope = "me" | "anyone" | "system";
export type AutoJoin = "never" | "mine" | "tagged" | "always";
export type ProjectKind = "managed" | "own";

export interface OptionCopy {
  readonly label: string;
  readonly desc: string;
}

export const MEDIA: Readonly<Record<MediaMode, OptionCopy>> = {
  speak: {
    label: "Speak and listen",
    desc: "Hears the room and can talk. Can also post to meeting chat.",
  },
  listen: {
    label: "Listen only",
    desc: "Hears the room and reads granted knowledge. Never speaks or posts.",
  },
  chat: { label: "Chat only", desc: "Hears the room and replies in meeting chat, never out loud." },
};

export const KNOWLEDGE: Readonly<Record<KnowledgeAccess, OptionCopy>> = {
  shared: {
    label: "Shared meeting knowledge",
    desc: "Includes the live transcript and anything participants add to the meeting’s knowledge.",
  },
  files: {
    label: "Shared knowledge plus host-only files",
    desc: "Also reads files the host has kept private to their own agents.",
  },
  none: {
    label: "None",
    desc: "Gets no transcript or files from KnowMe. Works only from what it hears.",
  },
};

export const DISPATCH: Readonly<Record<Exclude<DispatchScope, "system">, OptionCopy>> = {
  me: { label: "Only me", desc: "Only you can bring it into meetings you host." },
  anyone: {
    label: "Anyone in meetings I host",
    desc: "Any participant in a meeting you host can dispatch it.",
  },
};

export const AUTOJOIN: Readonly<Record<Exclude<AutoJoin, "always">, OptionCopy>> = {
  never: { label: "Never — on request", desc: "Joins only when someone dispatches it." },
  mine: { label: "My meetings", desc: "Joins every meeting you host as soon as it starts." },
  tagged: {
    label: "Meetings tagged…",
    desc: "Joins meetings you host that carry a tag you choose.",
  },
};

export const PROJECTS: Readonly<Record<ProjectKind, OptionCopy>> = {
  managed: {
    label: "KnowMe-managed project",
    desc: "Your worker connects to the same LiveKit project your meetings run on.",
  },
  own: {
    label: "My own LiveKit project",
    desc: "Your worker runs against your own LiveKit Cloud or self-hosted project.",
  },
};

export interface AgentConfig {
  readonly project: ProjectKind;
  readonly url?: string;
  readonly media: MediaMode;
  readonly knowledge: KnowledgeAccess;
  readonly dispatch: DispatchScope;
  readonly autoJoin: AutoJoin;
  readonly tag?: string;
}

/** A registry entry: the workspace agent plus its configuration. */
export interface RegistryAgent extends Omit<Agent, "id">, AgentConfig {
  readonly id: string;
  readonly paused: boolean;
}

export type DispatchOutcome = "live" | "done" | "failed";

export interface DispatchRecord {
  readonly meeting: string;
  readonly date: string;
  readonly min: number | null;
  readonly outcome: DispatchOutcome;
}

export const OUTCOME: Readonly<
  Record<DispatchOutcome, { readonly label: string; readonly tone: "cyan" | "green" | "red" }>
> = {
  live: { label: "In meeting now", tone: "cyan" },
  done: { label: "Completed", tone: "green" },
  failed: { label: "Worker offline — not joined", tone: "red" },
};

export interface DotMemory {
  readonly id: string;
  readonly meeting: string;
  readonly date: string;
  readonly text: string;
}

export type IrisVoice = "warm" | "calm" | "bright" | "low";

export interface IrisSettings {
  readonly name: string;
  readonly voice: IrisVoice;
  readonly join: "always" | "ask";
  readonly speak: "asked" | "never";
  readonly scope: {
    readonly summaries: boolean;
    readonly conversations: boolean;
    readonly files: boolean;
  };
  readonly paused: boolean;
  readonly byDefault: boolean;
}

export function projectText(agent: AgentConfig, managedUrl: string): string {
  return agent.project === "own" ? (agent.url ?? "Own LiveKit project") : managedUrl;
}

export function autoJoinText(agent: AgentConfig): string {
  if (agent.autoJoin === "always") return "Joins every meeting automatically";
  if (agent.autoJoin === "tagged") return `Joins meetings tagged “${agent.tag ?? "—"}”`;
  return AUTOJOIN[agent.autoJoin].label;
}

export function dispatchText(agent: AgentConfig): string {
  return agent.dispatch === "system"
    ? "Automatic — present in every meeting"
    : DISPATCH[agent.dispatch].label;
}
