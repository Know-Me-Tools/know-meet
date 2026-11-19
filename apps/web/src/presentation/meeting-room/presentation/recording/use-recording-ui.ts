// TJ-ARCH-MOB-001 compliant
// The room's recording view model (wc10 task 10.4): the consent state from
// `useRoomRecording`, participant names for the copy, and the one action the Record
// control performs in each state (request, cancel the request, stop). A refused request
// is announced with its cause and fix. The indicator turning on or off and each new
// one-time notice are announced once through the room's status region; the prompt
// speaks for itself (alertdialog).
import type { RoomSnapshot } from "@know-meet/application";
import { useEffect, useMemo, useRef } from "react";
import { type RoomRecordingView, useRoomRecording } from "../../../../app/recordings/hooks";
import type { Announce } from "../../../guest-meeting/live-status";
import {
  type NameOf,
  namesFrom,
  noticeText,
  RECORD_COPY,
  requestErrorText,
} from "./recording-copy";

/** What pressing Record does now; `blocked` explains instead of acting. */
export type RecordAction =
  | { readonly kind: "request" }
  | { readonly kind: "withdraw" }
  | { readonly kind: "stop" }
  | { readonly kind: "blocked"; readonly reason: string };

export interface RecordingUi {
  readonly recording: RoomRecordingView;
  readonly nameOf: NameOf;
  readonly action: RecordAction;
  readonly onRecordControl: () => void;
}

function actionFor(recording: RoomRecordingView, nameOf: NameOf): RecordAction {
  if (recording.recordingHere) return { kind: "stop" };
  if (recording.requesting) return { kind: "withdraw" };
  const { state } = recording;
  if (state.status === "remote-recording") {
    return { kind: "blocked", reason: `${nameOf(state.recorder)} is already recording.` };
  }
  if (state.status === "prompted") return { kind: "blocked", reason: RECORD_COPY.busyPrompted };
  if (recording.support === "unsupported") {
    return { kind: "blocked", reason: RECORD_COPY.unsupported };
  }
  return { kind: "request" };
}

/** Announces the indicator turning on (who records) and off, never on the first render. */
function useIndicatorAnnouncements(recording: RoomRecordingView, announce: Announce): void {
  const { indicatorOn, recordingHere } = recording;
  const previous = useRef(indicatorOn);
  useEffect(() => {
    if (previous.current === indicatorOn) return;
    previous.current = indicatorOn;
    if (!indicatorOn) announce(RECORD_COPY.stopped);
    else announce(recordingHere ? RECORD_COPY.startedHere : RECORD_COPY.startedElsewhere);
  }, [indicatorOn, recordingHere, announce]);
}

/** Announces each new one-time notice (the note itself is aria-live="off"). */
function useNoticeAnnouncements(
  recording: RoomRecordingView,
  nameOf: NameOf,
  announce: Announce,
): void {
  const { notice } = recording;
  const previous = useRef(notice);
  useEffect(() => {
    if (previous.current === notice) return;
    previous.current = notice;
    if (notice !== null) announce(noticeText(notice, nameOf));
  }, [notice, nameOf, announce]);
}

export function useRecordingUi(snapshot: RoomSnapshot, announce: Announce): RecordingUi {
  const recording = useRoomRecording();
  const { local, remotes } = snapshot;
  const nameOf = useMemo(
    () => namesFrom(local === null ? remotes : [local, ...remotes]),
    [local, remotes],
  );
  useIndicatorAnnouncements(recording, announce);
  useNoticeAnnouncements(recording, nameOf, announce);
  const action = actionFor(recording, nameOf);

  const onRecordControl = () => {
    switch (action.kind) {
      case "stop":
        recording.stop();
        return;
      case "withdraw":
        recording.withdraw();
        announce(RECORD_COPY.withdrawn);
        return;
      case "blocked":
        announce(action.reason);
        return;
      case "request": {
        const result = recording.request();
        announce(result.ok ? RECORD_COPY.asked : requestErrorText(result.error));
        return;
      }
    }
  };

  return { recording, nameOf, action, onRecordControl };
}
