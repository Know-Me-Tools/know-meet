/**
 * UI contract for the web-conferencing-features scenarios (WC-1 to WC-12).
 * Extends test-ids.ts. The builders (wc04 share and chat, wc05 devices, wc07
 * effects, wc09 history, wc10 recording) implement these values; a change here
 * is a contract change that goes to the owning role.
 *
 * Aligned to the four approved shapes in docs/design/shapes/web-conferencing/
 * (operator decision batch2-approval-web-conferencing-features, 2026-11-18).
 * Where a name below is still a guess at structure, the comment says ASSUMPTION.
 * Copy that the contract fixes ("Everyone", "Enable audio") is matched by role
 * and name. Every toggle carries data-state="on"|"off" as in test-ids.ts.
 *
 * Layout facts the specs rely on:
 *  - The specs run at the Desktop Chrome/Firefox/Safari viewport, not at 375.
 *    Below ROOM_BAR_SCROLL_BELOW_PX the room bar scrolls sideways and Leave may
 *    be off-screen; no spec asserts that every room control is in the viewport,
 *    and every click goes through Playwright's auto-scroll.
 *  - The adaptive navigation (Home, History, Recordings) renders exactly one
 *    variant per width class (bottom bar, rail or full navigation), so each
 *    km-nav-* id is unique on the page. Each hosted nav link carries exactly one
 *    of km-nav-home, km-nav-history, km-nav-recordings (km-nav-item is the default
 *    build's id), and the navigation is absent on /join and /meet.
 */

/** Room bar breakpoint (px): below it the bar scrolls sideways (shapes README, question 3). */
export const ROOM_BAR_SCROLL_BELOW_PX = 768;

/**
 * Adaptive navigation of the hosted build (shapes README, question 1). Entries
 * are links to /, /history and /recordings. HISTORY.nav and RECORDING.nav name
 * the same entries; NAV.home is the third.
 */
export const NAV = {
  home: "km-nav-home",
} as const;

/** Screen share (WC-1). */
export const SHARE = {
  /** Room control. data-state "on" while this participant shares. */
  control: "km-room-share-screen",
  /** One per active share in the room, local or remote. Carries data-participant-identity. */
  tile: "km-screen-share-tile",
  /**
   * <video> inside the tile with the subscribed screen-share track as srcObject;
   * data-track-source="screen_share" (the LiveKit Track.Source value).
   */
  video: "km-screen-share-video",
} as const;

export const SHARE_SOURCE = "screen_share";

/** Chat (WC-2, WC-3, WC-7). */
export const CHAT = {
  /** Room control that opens the panel; the panel may also be always visible. */
  toggle: "km-room-chat-toggle",
  panel: "km-chat-panel",
  input: "km-chat-input",
  /** ASSUMPTION: a native <select> named "Send to": "Everyone" plus one option per participant name. */
  audience: "km-chat-audience",
  send: "km-chat-send",
  /** One per message. data-audience="everyone"|"private". */
  message: "km-chat-message",
  /** Inside a message: exactly the message text. */
  messageText: "km-chat-message-text",
  /** Inside a message: "Everyone" or "Private to <name>" (ASSUMPTION on the private wording). */
  messageAudience: "km-chat-message-audience",
} as const;

export const AUDIENCE_EVERYONE = "Everyone";

/**
 * Devices (WC-5, WC-6; shapes/device-settings.md). Selects are native <select>
 * elements named "Microphone", "Camera" and "Speaker". The lobby offers the
 * microphone and the camera only; the speaker is chosen in the room, in the
 * Settings sheet (there is no lobby speaker control).
 */
export const DEVICES = {
  lobbyMicSelect: "km-lobby-mic-select",
  lobbyCameraSelect: "km-lobby-camera-select",
  /**
   * role="meter" named "Microphone level", aria-valuemin 0, aria-valuemax 100,
   * aria-valuenow an integer updated at most ten times a second (DS-2). It is
   * hidden while the microphone is off.
   */
  lobbyMicLevel: "km-lobby-mic-level",
  /**
   * Room control (aria-controls the side sheet; aria-expanded "true" while the
   * "Audio and video" pane is open). Opening it shows the pane that holds the
   * room device selects and the Background section.
   */
  roomSettings: "km-room-settings",
  roomMicSelect: "km-settings-mic-select",
  roomCameraSelect: "km-settings-camera-select",
  /** Absent where setSinkId is unsupported; km-speaker-unsupported shows instead. Room only. */
  roomSpeakerSelect: "km-settings-speaker-select",
  /** role="status", inside the Settings pane under the Speaker heading: the announced reason the speaker choice is not offered. */
  speakerUnsupported: "km-speaker-unsupported",
} as const;

/** Title of the Settings sheet pane (shapes/device-settings.md), an h2. */
export const SETTINGS_PANE_TITLE = "Audio and video";

/** Attribute that carries the lobby meter value (a number from 0 to 100). */
export const LEVEL_ATTRIBUTE = "aria-valuenow";

/** Enable audio (WC-12). The button is found by role and name "Enable audio". */
export const AUDIO_PROMPT = {
  buttonName: "Enable audio",
  /** The meeting root mirrors Room.canPlaybackAudio in data-can-playback-audio="true"|"false". */
  stateAttribute: "data-can-playback-audio",
} as const;

/**
 * Background effects (WC-4; shapes/background-effects.md). There is no separate
 * room control: the Background section is part of the Settings sheet ("Audio
 * and video" pane), reached through DEVICES.roomSettings. It is a
 * role="radiogroup" named "Background" of five role="radio" cards (None, Blur,
 * three images) and stays open between choices.
 */
export const EFFECTS = {
  /** Accessible name of the radiogroup, matched by role and name. */
  groupName: "Background",
  /** The None card. */
  off: "km-effect-off",
  /** The Blur card (name "Blur your background"). */
  blur: "km-effect-blur",
  /** One per image card (three, names "Image background: <name>"); the first is chosen. */
  imageOption: "km-effect-image-option",
  /**
   * On km-local-tile: data-video-processor="none"|"background-blur"|"virtual-background",
   * derived by the app from the port's backgroundEffect snapshot (status "active" with
   * blur or image gives the processor name, anything else "none"); the adapter reports
   * "active" only after the processor is applied to the published track. The attribute
   * is the product's claim; WC-4 proves it with the pixels on B (wc-frames.ts).
   */
  processorAttribute: "data-video-processor",
} as const;

/** Local history (WC-7). */
export const HISTORY = {
  /** Entry of the adaptive navigation; leads to the /history route (a screen of the hosted build). */
  nav: "km-nav-history",
  /** The list screen at /history. */
  screen: "km-screen-history",
  /** One per meeting in the list (a <li>). data-history-id carries the local id (not the room code). */
  entry: "km-history-entry",
  /** A <time> element with a datetime attribute. */
  entryDate: "km-history-entry-date",
  /** The row link inside an entry; opens the detail at /history#meeting:<id>. */
  entryOpen: "km-history-entry-open",
  /** One per stored chat message in the detail. */
  message: "km-history-message",
  /** Delete button in the detail (an alertdialog confirms). */
  del: "km-history-delete",
  deleteConfirm: "km-history-delete-confirm",
  /** The notice on the list, above the meetings, that states the chat is kept on this device only (D5). */
  deviceOnlyNotice: "km-history-device-only",
} as const;

/** Local recording (WC-8, WC-9). */
export const RECORDING = {
  /** Room control. data-state "on" while this browser records. */
  control: "km-room-record",
  /** Consent prompt shown to every other present participant. */
  prompt: "km-recording-consent-prompt",
  agree: "km-recording-consent-agree",
  decline: "km-recording-consent-decline",
  /** Visible to every participant while a recording runs, and to nobody otherwise. */
  indicator: "km-recording-indicator",
  /** role="status" shown to the requester after a decline. */
  declined: "km-recording-request-declined",
  /** Entry of the adaptive navigation; leads to the /recordings route (a screen of the hosted build). */
  nav: "km-nav-recordings",
  /** The library screen at /recordings. */
  library: "km-recordings-library",
  /** One per saved recording, a card link to the detail at /recordings#recording:<id>; data-duration-ms and data-size-bytes. */
  item: "km-recording-item",
  /** The player's play button, in the detail. */
  play: "km-recording-play",
  /** <video> whose src is a blob: URL. */
  player: "km-recording-player",
} as const;
