// TJ-ARCH-MOB-001 compliant
// Meeting-room layout model (c11 task 11.5, media stubbed). Mirrors the tile kinds
// of docs/design/prototype/meet.html `renderStage`: people, persistent dots,
// agents (system or registered LiveKit agents) and phone dial-in. No framework,
// LiveKit or UI imports.

/** `full` = signed-in room (#room); `guest` = guest room (#room-guest). */
export type RoomMode = "full" | "guest";

/** Agent and dot activity (meet.html `stateLabel`). */
export type PresenceState = "listening" | "thinking" | "speaking" | "paused";

interface TileBase {
  readonly id: string;
  readonly name: string;
  /** The participant currently speaking shows the speaking badge plus spoken text. */
  readonly speaking: boolean;
}

export interface PersonTile extends TileBase {
  readonly kind: "person";
  readonly initials: string;
  readonly isSelf: boolean;
  readonly isHost: boolean;
  readonly muted: boolean;
  /** Always false while media is stubbed; the tile shows the initials placeholder. */
  readonly cameraOn: boolean;
}

export interface DotTile extends TileBase {
  readonly kind: "dot";
  /** "Your dot" or "Avery’s dot". */
  readonly ownerLabel: string;
  readonly mine: boolean;
  readonly tone: "ember" | "cyan";
  readonly state: PresenceState;
}

export interface AgentTile extends TileBase {
  readonly kind: "agent";
  readonly role: string;
  readonly mono: string;
  readonly system: boolean;
  readonly state: PresenceState;
}

export interface PhoneTile extends TileBase {
  readonly kind: "phone";
  /** "+1 (206) 555-0163 · Dana (phone)". */
  readonly label: string;
  readonly mutedByHost: boolean;
}

export type RoomTile = PersonTile | DotTile | AgentTile | PhoneTile;

export interface RoomModel {
  readonly mode: RoomMode;
  readonly title: string;
  readonly joinCode: string;
  readonly transcribing: boolean;
  readonly isHost: boolean;
  readonly tiles: readonly RoomTile[];
}

const STATE_LABELS: Readonly<Record<PresenceState, string>> = {
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  paused: "Paused",
};

export function presenceLabel(state: PresenceState): string {
  return STATE_LABELS[state];
}

/** meet.html `colsFor`: grid columns from the tile count and the stage width. */
export function columnsFor(count: number, stageWidth: number): number {
  if (stageWidth < 600) return count <= 1 || stageWidth < 420 ? 1 : 2;
  if (stageWidth < 1000) return count <= 1 ? 1 : count <= 4 ? 2 : 3;
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  return count <= 9 ? 3 : 4;
}

/** The tile's accessible name (meet.html `aria-label` on each `article.tile`). */
export function tileLabel(tile: RoomTile): string {
  switch (tile.kind) {
    case "person":
      return `${tile.name}${tile.isSelf ? " (you)" : ""}${tile.isHost ? ", host" : ""}`;
    case "dot":
      return `${tile.name}, ${tile.ownerLabel}, persistent dot`;
    case "agent":
      return tile.system ? `${tile.name}, system agent` : `${tile.name}, LiveKit agent, ${tile.role}`;
    case "phone":
      return `${tile.label}, dialed in, audio only${tile.mutedByHost ? ", muted by host" : ""}`;
  }
}
