/**
 * UI contract for the web-release scenarios (WR-1, WR-2, WR-5, WR-8).
 *
 * The builders (wr05 ui-engineer, wr06 client-shell) implement exactly these
 * `data-testid` values and accessible names. The specs prefer role + name
 * locators where the name is stable copy, and test ids for media elements,
 * screen roots and state panels. Changing a value here is a contract change:
 * update the README and tell the owning role.
 */

/** Screen roots. Present whenever the route renders, whatever its state. */
export const SCREEN = {
  home: "km-screen-home",
  join: "km-screen-join",
  meet: "km-screen-meet",
} as const;

/**
 * Home (`/`): start a meeting or join one by code. The display name is entered
 * in the lobby only (docs/design/web-release-acceptance.md section 0).
 */
export const HOME = {
  /** <button> "Start a meeting": POST /api/meetings, then the lobby for the new code. */
  startMeeting: "km-home-start-meeting",
  /** <input> "Meeting code". */
  joinCode: "km-home-join-code",
  /** <button> "Join": the lobby for the typed code. */
  join: "km-home-join",
} as const;

/** Join lobby (`/join`): name, device preview and the join action. */
export const LOBBY = {
  /** <input> "Your name". */
  displayName: "km-lobby-display-name",
  /** <video> showing the local camera preview. */
  cameraPreview: "km-lobby-camera-preview",
  /** Toggle <button>; carries DATA_STATE. */
  micToggle: "km-lobby-mic-toggle",
  /** Toggle <button>; carries DATA_STATE. */
  cameraToggle: "km-lobby-camera-toggle",
  /** <button> "Join meeting": POST /api/token, then the room. */
  join: "km-lobby-join",
} as const;

/** Meeting room (`/meet`). */
export const ROOM = {
  /** Element whose text content is exactly the room code, e.g. "km-4fq-82x". */
  roomCode: "km-room-code",
  /** The local participant's tile. Exactly one while connected. */
  localTile: "km-local-tile",
  /**
   * One per remote participant, and nothing else uses this id. Carries
   * `data-participant-identity` with the LiveKit identity.
   */
  remoteTile: "km-remote-tile",
  /** <video> inside a remote tile with the subscribed camera track attached. */
  remoteVideo: "km-remote-video",
  /**
   * <audio> inside the same remote tile with the subscribed microphone track
   * attached (srcObject is a MediaStream holding that track).
   */
  remoteAudio: "km-remote-audio",
  /** Inside a remote tile; visible only while that participant's microphone is muted. */
  participantMuted: "km-participant-muted",
  /** Microphone control; carries DATA_STATE ("off" while muted). */
  muteMic: "km-room-mute-mic",
  /** Camera control; carries DATA_STATE ("off" while the camera is off). */
  muteCamera: "km-room-mute-camera",
  /** <button> "Leave": opens the leave dialog, or leaves directly if there is no dialog. */
  leave: "km-room-leave",
  /** <button> "Leave meeting" in the leave dialog (design decision O-7). */
  leaveConfirm: "km-room-leave-confirm",
} as const;

/** State panels. Each is a container with role="alert" or role="status" and a heading. */
export const STATE = {
  /** The code was never issued or has expired (token endpoint answered 404). */
  meetingNotFound: "km-state-meeting-not-found",
  /** Camera or microphone permission was denied. */
  permissionDenied: "km-state-permission-denied",
  /** The realtime connection was lost and did not come back. */
  disconnected: "km-state-disconnected",
  /** Any unmatched path, and every excluded route in the hosted build. */
  notFound: "km-not-found",
} as const;

/**
 * State attribute on every media toggle: `data-state="on"` or `"off"`. Toggles
 * use action names, not aria-pressed (design conflict K-1), so the specs read
 * this attribute instead of the accessible name.
 */
export const DATA_STATE = "data-state";

/** Storage keys shared with the prototype and the fidelity suite. */
export const STORAGE = {
  theme: "km-meet-theme",
  auth: "km-auth",
} as const;

/** Paths the hosted build serves; every other path renders STATE.notFound. */
export const HOSTED_PATHS: readonly string[] = ["/", "/join", "/meet"];

/** Paths excluded from the hosted build by the contract (WR-5). */
export const EXCLUDED_PATHS: readonly string[] = [
  "/dashboard",
  "/agents",
  "/recordings",
  "/settings",
  "/notes",
  "/auth",
];

/** CSS selector for a test id. */
export function byTestId(id: string): string {
  return `[data-testid="${id}"]`;
}
