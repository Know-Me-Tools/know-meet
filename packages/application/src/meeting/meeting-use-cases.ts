import {
  err,
  isInRoom,
  isTrackMuted,
  meetingErrors,
  ok,
  parseDisplayName,
  parseRoomCode,
  type ParticipantIdentity,
  type Result,
  type RoomCode,
  type TrackKind,
} from "@know-meet/domain";
import type {
  ConnectError,
  CreateMeetingError,
  MediaError,
  RealtimeRoom,
  TokenIssuer,
  TokenRequestError,
} from "./ports.ts";

export interface MeetingPorts {
  readonly issuer: TokenIssuer;
  readonly room: RealtimeRoom;
}

export interface JoinRequest {
  /** The code as typed or as carried by a link; parsed here. */
  readonly code: string;
  /** The name as typed in the lobby; trimmed and checked here. */
  readonly displayName: string;
  /** The lobby's device choices, applied after connecting. */
  readonly microphoneEnabled: boolean;
  readonly cameraEnabled: boolean;
}

export interface JoinedMeeting {
  readonly code: RoomCode;
  readonly identity: ParticipantIdentity;
  /** Devices the browser refused. The guest stays in the meeting without them (lobby L4). */
  readonly deniedDevices: readonly TrackKind[];
}

export type JoinError = TokenRequestError | ConnectError;

/** Start, join, leave and mute, expressed only against the two ports. */
export interface MeetingUseCases {
  /** Asks the token service for a new room code. Connects nothing. */
  start(signal?: AbortSignal): Promise<Result<RoomCode, CreateMeetingError>>;
  /**
   * Checks the code and name, asks for a token, connects, then applies the device choices.
   * A code that cannot exist, or that the issuer refuses, ends here and never connects.
   */
  join(request: JoinRequest, signal?: AbortSignal): Promise<Result<JoinedMeeting, JoinError>>;
  leave(): Promise<void>;
  setMuted(kind: TrackKind, muted: boolean): Promise<Result<void, MediaError>>;
  toggleMuted(kind: TrackKind): Promise<Result<void, MediaError>>;
}

const DEVICE_KINDS: readonly TrackKind[] = ["microphone", "camera"];

export function createMeetingUseCases(ports: MeetingPorts): MeetingUseCases {
  return {
    start: (signal) => ports.issuer.createMeeting(signal),
    join: (request, signal) => joinMeeting(ports, request, signal),
    leave: () => ports.room.disconnect(),
    setMuted: (kind, muted) => setMuted(ports.room, kind, muted),
    toggleMuted: (kind) => toggleMuted(ports.room, kind),
  };
}

async function joinMeeting(
  ports: MeetingPorts,
  request: JoinRequest,
  signal: AbortSignal | undefined,
): Promise<Result<JoinedMeeting, JoinError>> {
  const code = parseRoomCode(request.code);
  if (code === null) return err(meetingErrors.notFound());
  const displayName = parseDisplayName(request.displayName);
  if (displayName === null) return err(meetingErrors.invalidRequest());
  const credentials = await ports.issuer.requestToken({ code, displayName }, signal);
  if (!credentials.ok) return credentials;
  const connected = await ports.room.connect(credentials.value);
  if (!connected.ok) return connected;
  const deniedDevices = await applyDeviceChoices(ports.room, request);
  return ok({ code, identity: credentials.value.identity, deniedDevices });
}

/** Enables the chosen devices one at a time, so the browser shows one prompt at a time. */
async function applyDeviceChoices(
  room: RealtimeRoom,
  request: JoinRequest,
): Promise<readonly TrackKind[]> {
  const denied: TrackKind[] = [];
  for (const kind of DEVICE_KINDS) {
    const wanted = kind === "microphone" ? request.microphoneEnabled : request.cameraEnabled;
    if (!wanted) continue;
    const result = await room.setMediaEnabled(kind, true);
    if (!result.ok && result.error.code === "permission-denied") denied.push(kind);
  }
  return denied;
}

async function setMuted(
  room: RealtimeRoom,
  kind: TrackKind,
  muted: boolean,
): Promise<Result<void, MediaError>> {
  if (!isInRoom(room.getSnapshot().connection)) return err(meetingErrors.connectionLost());
  return room.setMediaEnabled(kind, !muted);
}

async function toggleMuted(room: RealtimeRoom, kind: TrackKind): Promise<Result<void, MediaError>> {
  const local = room.getSnapshot().local;
  if (local === null) return err(meetingErrors.connectionLost());
  return setMuted(room, kind, !isTrackMuted(local, kind));
}
