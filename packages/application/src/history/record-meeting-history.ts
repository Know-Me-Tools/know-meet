import {
  type ChatMessageId,
  endMeetingSession,
  type HistoryError,
  isInRoom,
  type MeetingHistoryId,
  type MeetingSession,
  type ParticipantIdentity,
  type RecordingConsentState,
  type RecordingRequestId,
  type Result,
  type RoomCode,
  type SeenParticipant,
  seenName,
  startMeetingSession,
  toHistoryChatMessage,
  withParticipantsSeen,
} from "@know-meet/domain";
import type { RealtimeRoom, RoomSnapshot } from "../meeting/ports.ts";
import type { HistoryRepository } from "./ports.ts";

/** The recording consent state, read like the room. `RecordingConsent` satisfies it. */
export interface RecordingStateSource {
  getSnapshot(): RecordingConsentState;
  subscribe(listener: () => void): () => void;
}

export interface MeetingHistoryPorts {
  readonly room: RealtimeRoom;
  readonly history: HistoryRepository;
  /**
   * A fresh history id per session, for example `crypto.randomUUID()` checked with
   * `parseMeetingHistoryId`. Never the room code.
   */
  readonly newHistoryId: () => MeetingHistoryId;
  /** Milliseconds since the Unix epoch. */
  readonly now: () => number;
  /**
   * When given, each recording this browser makes during the session is linked to it once
   * the recorder is running (`local-recording`); a request that never started is not.
   */
  readonly recording?: RecordingStateSource;
}

/** The meeting being joined. */
export interface MeetingToRecord {
  readonly code: RoomCode;
  /** The room's display name; omitted or null when it has none. */
  readonly title?: string | null;
}

/**
 * - `waiting`: not in the room yet; nothing is kept until the room is joined.
 * - `recording`: the session is kept and updated as people and messages arrive.
 * - `ended`: the room was left; the session's end is (being) written.
 * - `stopped`: history stopped for this session and writes nothing more. `unavailable`:
 *   the browser blocks storage. `failed`: a write failed. `deleted`: the session was
 *   deleted while it ran (perhaps in another tab), and is not recreated.
 */
export type MeetingHistoryRecorderState =
  | { readonly status: "waiting" }
  | { readonly status: "recording"; readonly meetingId: MeetingHistoryId }
  | { readonly status: "ended"; readonly meetingId: MeetingHistoryId }
  | {
      readonly status: "stopped";
      readonly reason: "unavailable" | "failed" | "deleted";
      readonly meetingId: MeetingHistoryId;
    };

export interface MeetingHistoryRecorder {
  getState(): MeetingHistoryRecorderState;
  /** Resolves once every write so far has finished. */
  settled(): Promise<void>;
  /** Stops listening; a running session is ended as `left` first. */
  dispose(): Promise<void>;
}

/**
 * Keeps one meeting session in this device's history (WC-7): created when the room is
 * joined, updated with the people seen, every chat message this device sends or receives
 * while present, and local recordings made, and ended when the room is left. History
 * never waits on the meeting and the meeting never waits on history: a storage failure
 * only stops recording history.
 *
 * Chat is read from the room snapshot's append-only `chat`: only the entries past the
 * length last seen are new. The list starts empty again on a new `connect`, so a shorter
 * list (or a different first message) starts over from the beginning, and every message
 * is written at most once by id. The repository also skips ids it already has.
 *
 * Writes run one at a time, in order, so a session is always created before its chat and
 * ended after it. Create one recorder per join, right after `join` succeeds.
 */
export function recordMeetingHistory(
  ports: MeetingHistoryPorts,
  meeting: MeetingToRecord,
): MeetingHistoryRecorder {
  const { room, history } = ports;
  let state: MeetingHistoryRecorderState = { status: "waiting" };
  let session: MeetingSession | null = null;
  let chatSeen = 0;
  let firstChatId: ChatMessageId | null = null;
  const kept = new Set<ChatMessageId>();
  const linked = new Set<RecordingRequestId>();
  let chain: Promise<void> = Promise.resolve();
  const unsubscribers: Array<() => void> = [];

  const unsubscribeAll = (): void => {
    for (const unsubscribe of unsubscribers.splice(0)) unsubscribe();
  };

  const stop = (reason: "unavailable" | "failed" | "deleted"): void => {
    if (state.status === "waiting" || state.status === "stopped") return;
    state = { status: "stopped", reason, meetingId: state.meetingId };
    unsubscribeAll();
  };

  const stopFor = (error: HistoryError): void => {
    if (error.code === "history-unavailable") stop("unavailable");
    else if (error.code === "history-entry-not-found") stop("deleted");
    else stop("failed");
  };

  /** Queues one write. Once stopped, queued writes are skipped. A throw counts as failed. */
  const write = (operation: () => Promise<Result<void, HistoryError>>): void => {
    chain = chain.then(async () => {
      if (state.status === "stopped") return;
      try {
        const result = await operation();
        if (!result.ok) stopFor(result.error);
      } catch {
        stop("failed");
      }
    });
  };

  const begin = (snapshot: RoomSnapshot): MeetingSession => {
    const started = startMeetingSession({
      id: ports.newHistoryId(),
      roomCode: meeting.code,
      title: meeting.title ?? null,
      joinedAt: ports.now(),
      participants: participantsIn(snapshot),
    });
    session = started;
    state = { status: "recording", meetingId: started.id };
    write(() => history.createMeeting(started));
    return started;
  };

  const noteParticipants = (current: MeetingSession, snapshot: RoomSnapshot): MeetingSession => {
    const next = withParticipantsSeen(current, participantsIn(snapshot));
    if (next === current) return current;
    session = next;
    write(() => history.updateMeeting(next));
    return next;
  };

  const noteChat = (current: MeetingSession, snapshot: RoomSnapshot): void => {
    const chat = snapshot.chat;
    const restarted = chat.length < chatSeen || (chatSeen > 0 && chat[0]?.id !== firstChatId);
    const from = restarted ? 0 : chatSeen;
    chatSeen = chat.length;
    firstChatId = chat[0]?.id ?? null;
    const fresh = chat.slice(from).filter((message) => !kept.has(message.id));
    if (fresh.length === 0) return;
    for (const message of fresh) kept.add(message.id);
    const nameOf = (identity: ParticipantIdentity) => seenName(current, identity);
    const records = fresh.map((message) => toHistoryChatMessage(current.id, message, nameOf));
    write(() => history.appendChat(current.id, records));
  };

  const end = (current: MeetingSession, reason: "left" | "connection-lost"): void => {
    const ended = endMeetingSession(current, ports.now(), reason);
    session = ended;
    state = { status: "ended", meetingId: ended.id };
    unsubscribeAll();
    write(() => history.updateMeeting(ended));
  };

  const onRoomChange = (): void => {
    const snapshot = room.getSnapshot();
    if (state.status === "waiting") {
      if (!isInRoom(snapshot.connection)) return;
      begin(snapshot);
    }
    if (state.status !== "recording" || session === null) return;
    const current = noteParticipants(session, snapshot);
    noteChat(current, snapshot);
    if (snapshot.connection.status === "disconnected") end(current, snapshot.connection.reason);
  };

  const onRecordingChange = (): void => {
    if (state.status !== "recording" || ports.recording === undefined) return;
    const recording = ports.recording.getSnapshot();
    if (recording.status !== "local-recording" || linked.has(recording.requestId)) return;
    linked.add(recording.requestId);
    const meetingId = state.meetingId;
    const recordingId = recording.requestId;
    write(() => history.linkRecording(meetingId, recordingId));
  };

  unsubscribers.push(room.subscribe(onRoomChange));
  if (ports.recording !== undefined)
    unsubscribers.push(ports.recording.subscribe(onRecordingChange));
  onRoomChange();
  onRecordingChange();

  return {
    getState: () => state,
    settled: () => chain,
    dispose: async () => {
      if (state.status === "recording" && session !== null) end(session, "left");
      unsubscribeAll();
      await chain;
    },
  };
}

/** This participant first, then remote participants in join order. */
function participantsIn(snapshot: RoomSnapshot): readonly SeenParticipant[] {
  const remotes = snapshot.remotes.map((remote) => ({
    identity: remote.identity,
    name: remote.displayName,
  }));
  if (snapshot.local === null) return remotes;
  return [{ identity: snapshot.local.identity, name: snapshot.local.displayName }, ...remotes];
}
