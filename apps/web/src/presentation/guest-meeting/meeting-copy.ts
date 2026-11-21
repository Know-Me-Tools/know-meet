// TJ-ARCH-MOB-001 compliant
// Copy for the guest meeting flow, verbatim from docs/design/web-release-acceptance.md
// section 7 (operator decision O-1: the proposed copy). Errors give the cause, then the
// fix. Domain and application carry codes only; every string lives here.
import type { CreateMeetingError, JoinError, MediaError } from "@know-meet/application";
import type { TrackKind } from "@know-meet/domain";

export interface ErrorCopy {
  readonly heading: string;
  readonly text: string;
}

export const CODE_EXAMPLE = "km-4fq-82x";

export const HOME_COPY = {
  codeEmpty: `Enter the meeting code, for example ${CODE_EXAMPLE}.`,
  codeInvalid: `Codes look like ${CODE_EXAMPLE}: “km”, then two groups of three letters or numbers, joined by hyphens.`,
  codeHint: "Ask the person who started the meeting for the code.",
} as const;

export function startErrorCopy(error: CreateMeetingError): ErrorCopy {
  if (error.code === "rate-limited") {
    return {
      heading: "Too many new meetings",
      text: "This network started too many meetings in a short time. Wait a minute, then try again.",
    };
  }
  return {
    heading: "Couldn’t start a meeting",
    text: "The meeting service didn’t answer. Check your connection, then try again.",
  };
}

/** Join failures shown as the lobby error card (L6e). Not-found and name have their own views. */
export function joinErrorCopy(error: JoinError): ErrorCopy {
  if (error.code === "rate-limited") {
    return {
      heading: "Too many join attempts",
      text: "This network tried to join too many times in a short time. Wait a minute, then try again.",
    };
  }
  if (error.code === "forbidden") {
    return {
      heading: "Couldn’t connect to the meeting",
      text: "Your network may be blocking video calls. Try another network, then select Join meeting again.",
    };
  }
  return {
    heading: "Couldn’t join the meeting",
    text: "The meeting service didn’t answer. Check your connection, then select Join meeting again.",
  };
}

export const LOBBY_COPY = {
  nameHint: "Shown on your tile.",
  nameEmpty: "Enter your name so others know who you are.",
  previewOff: "Your camera is off. Turn it on to check how you look before you join.",
  previewPending:
    "Allow camera and microphone access in your browser’s prompt to see your preview.",
  shareLine: "Anyone with the code or link joins from their browser. No account needed.",
} as const;

/** Why the lobby could not use a device. The port cannot tell these apart once in the room. */
export type DeviceProblem = "blocked" | "missing" | "in-use";

const DEVICE_NOUN: Readonly<Record<TrackKind, string>> = {
  camera: "camera",
  microphone: "microphone",
};

export function deviceProblemCopy(
  camera: DeviceProblem | null,
  microphone: DeviceProblem | null,
): ErrorCopy | null {
  if (camera === "blocked" && microphone === "blocked") {
    return {
      heading: "Camera and microphone access are blocked",
      text: "Allow them in your browser’s site settings for this page, then turn them on again. You can still join and listen.",
    };
  }
  const kind: TrackKind | null =
    camera !== null ? "camera" : microphone !== null ? "microphone" : null;
  if (kind === null) return null;
  const problem = kind === "camera" ? camera : microphone;
  return problem === null ? null : singleDeviceCopy(kind, problem);
}

function singleDeviceCopy(kind: TrackKind, problem: DeviceProblem): ErrorCopy {
  const camera = kind === "camera";
  if (problem === "missing") {
    return {
      heading: camera ? "No camera found" : "No microphone found",
      text: camera
        ? "Plug one in, then pick it from the Camera list. You can still join without it."
        : "Plug one in, then pick it from the Microphone list. You can still join and listen.",
    };
  }
  if (problem === "in-use") {
    return {
      heading: `Your ${DEVICE_NOUN[kind]} is in use by another app`,
      text: "Close the other app, then turn it on again.",
    };
  }
  return {
    heading: camera ? "Camera access is blocked" : "Microphone access is blocked",
    text: camera
      ? "Allow the camera in your browser’s site settings for this page, then turn it on again. You can still join without it."
      : "Allow the microphone in your browser’s site settings for this page, then turn it on again. You can still join and listen.",
  };
}

/**
 * In the room the port reports a refused device as permission-denied whatever the cause
 * (blocked, missing or in use), so the room cannot name the cause. It shows the
 * blocked copy after a join, and the section 7.3 line after a failed toggle.
 */
export function roomBlockedCopy(blocked: readonly TrackKind[]): ErrorCopy | null {
  return deviceProblemCopy(
    blocked.includes("camera") ? "blocked" : null,
    blocked.includes("microphone") ? "blocked" : null,
  );
}

export function roomToggleFailedCopy(kind: TrackKind, error: MediaError): ErrorCopy {
  if (error.code === "connection-lost") {
    return {
      heading: "You’re not connected",
      text: "The meeting connection dropped. Wait for it to come back, then try again.",
    };
  }
  return {
    heading: kind === "camera" ? "Camera unavailable" : "Microphone unavailable",
    text: `Couldn’t turn on your ${DEVICE_NOUN[kind]}. Another app may be using it.`,
  };
}

export const ROOM_COPY = {
  aloneHeading: "You’re the only one here",
  aloneLine: "Share the code or link. People join from their browser, no account needed.",
  disconnectedHeading: "You were disconnected",
  disconnectedText:
    "The connection dropped and couldn’t be restored. Check your network, then rejoin.",
  leftHeading: "You left the meeting",
  leftText:
    "The meeting stays open for anyone still in it. Rejoin with the same code while it’s open.",
  reloadText: "Reloading the page took you out of the meeting.",
  savingHistory: "Saving this meeting to your history on this device…",
  leaveTitle: "Leave the meeting?",
  leaveText: "The meeting stays open for anyone still in it.",
  copyFailed: "Couldn’t copy. Select the code and copy it yourself.",
} as const;
