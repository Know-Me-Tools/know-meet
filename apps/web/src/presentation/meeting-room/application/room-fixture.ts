// TJ-ARCH-MOB-001 compliant
// Static room fixture (no network, no media). Reproduces meet.html `enterRoom` for
// a direct visit: the live sample meeting ("Partner onboarding review"), the three
// people already in the room (Priya muted), and for the signed-in room your dot
// Iris, Avery's dot Sol, the Concierge and Scribe (the start form's default agent,
// online). The guest room keeps people plus the Concierge only, and Avery hosts.
// Phone dial-in arrives later in the prototype's script, so it is not seeded.
import { initialsOf } from "../../workspace/application/format";
import { findById, findPerson, type Workspace } from "../../workspace/domain/workspace";
import type { AgentTile, DotTile, PersonTile, RoomMode, RoomModel, RoomTile } from "../domain/room";

/** meet.html `HUMANS`: the people already in the room. */
const HUMAN_IDS = ["avery", "marcus", "priya"] as const;
/** meet.html `room.muted` on entry. */
const MUTED_ON_ENTRY: ReadonlySet<string> = new Set(["priya"]);
/** meet.html `meeting.agents` for a direct visit, filtered to online agents. */
const DEFAULT_AGENTS = ["scribe"] as const;
const GUEST_NAME = "Guest";

function personTiles(workspace: Workspace, mode: RoomMode, selfName: string): PersonTile[] {
  const isHost = mode === "full";
  const self: PersonTile = {
    kind: "person",
    id: "me",
    name: selfName,
    initials: initialsOf(selfName),
    isSelf: true,
    isHost,
    muted: false,
    cameraOn: false,
    speaking: false,
  };
  const others = HUMAN_IDS.flatMap((id): PersonTile[] => {
    const person = findPerson(workspace, id);
    if (person === null) return [];
    return [
      {
        kind: "person",
        id,
        name: person.name,
        initials: initialsOf(person.name),
        isSelf: false,
        // The guest room is hosted by Avery (meet.html `hostTag`).
        isHost: !isHost && id === "avery",
        muted: MUTED_ON_ENTRY.has(id),
        cameraOn: false,
        speaking: false,
      },
    ];
  });
  return [self, ...others];
}

function dotTiles(workspace: Workspace): DotTile[] {
  // meet.html roster order: your dot (Iris) first, then Avery's dot (Sol).
  return ["iris", "sol"].flatMap((id): DotTile[] => {
    const dot = findById(workspace.dots, id);
    if (dot === null) return [];
    return [
      {
        kind: "dot",
        id,
        name: dot.name,
        ownerLabel: dot.ownerLabel,
        mine: dot.owner === "you",
        tone: dot.color,
        state: "listening",
        speaking: false,
      },
    ];
  });
}

function agentTiles(workspace: Workspace, ids: readonly string[]): AgentTile[] {
  return ids.flatMap((id): AgentTile[] => {
    const agent = findById(workspace.agents, id);
    if (agent === null || (!agent.system && agent.status !== "online")) return [];
    return [
      {
        kind: "agent",
        id,
        name: agent.name,
        role: agent.role,
        mono: agent.mono,
        system: agent.system,
        state: "listening",
        speaking: false,
      },
    ];
  });
}

/** The room as it renders on entry. `selfName` is the signed-in user's name (full mode). */
export function buildRoomModel(
  workspace: Workspace,
  mode: RoomMode,
  selfName: string | null,
): RoomModel {
  const meeting = workspace.meetings[0];
  const name = mode === "full" && selfName !== null ? selfName : GUEST_NAME;
  const tiles: RoomTile[] =
    mode === "full"
      ? [
          ...personTiles(workspace, mode, name),
          ...dotTiles(workspace),
          ...agentTiles(workspace, ["concierge", ...DEFAULT_AGENTS]),
        ]
      : [...personTiles(workspace, mode, name), ...agentTiles(workspace, ["concierge"])];
  return {
    mode,
    title: meeting?.title ?? "Meeting",
    joinCode: meeting?.joinCode ?? "",
    transcribing: true,
    isHost: mode === "full",
    tiles,
  };
}

/**
 * Which room a hash renders (meet.html `routeRoom` / `routeRoomGuest`): `#room`
 * signed in is the full room; signed out it becomes the guest room. `#room-guest`
 * is always the guest room. Every other hash (out of scope this phase: #start,
 * #lobby, #ended, #processing, panel sub-states) falls back the same way as `#room`.
 */
export function roomModeFor(view: string, signedIn: boolean): RoomMode {
  if (view === "room-guest") return "guest";
  return signedIn ? "full" : "guest";
}
