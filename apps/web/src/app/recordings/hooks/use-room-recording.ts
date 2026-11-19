// TJ-ARCH-MOB-001 compliant
import type { RecordRequestError } from "@know-meet/application";
import {
  type ConsentAnswer,
  type ConsentNotice,
  type ConsentPrompt,
  consentPrompt,
  isRecordingIndicatorOn,
  type RecordingConsentState,
  type Result,
  type Support,
} from "@know-meet/domain";
import { useMemo, useSyncExternalStore } from "react";
import { useAppServices } from "../../app-services";

export interface RoomRecordingView {
  /** The whole consent state, for exhaustive screens. */
  readonly state: RecordingConsentState;
  /** The question this participant must answer now, or null. Show a prompt when set. */
  readonly prompt: ConsentPrompt | null;
  /** True while a recording runs or starts anywhere in the room: show the indicator. */
  readonly indicatorOn: boolean;
  /** True while this device is the one recording (offer "Stop recording"). */
  readonly recordingHere: boolean;
  /** True while this participant's own request waits for answers (offer "Cancel request"). */
  readonly requesting: boolean;
  /** One-time notice (declined, not sent, recorder failed, stopped); clear it with `dismissNotice`. */
  readonly notice: ConsentNotice | null;
  /** `unsupported`: hide or explain the request control; it would fail. */
  readonly support: Support;
  readonly request: () => Result<void, RecordRequestError>;
  readonly answer: (answer: ConsentAnswer) => void;
  readonly withdraw: () => void;
  readonly stop: () => void;
  readonly dismissNotice: () => void;
}

/**
 * Recording consent for the meeting the page is in (WC-8, WC-9, decision D2): request,
 * answer the prompt (including a late joiner's, which stops the recording for everyone
 * when declined), the indicator, stop, and notices. Outside a meeting the state is idle
 * and the actions do nothing.
 */
export function useRoomRecording(): RoomRecordingView {
  const { meeting } = useAppServices();
  const { recording } = meeting;
  const state = useSyncExternalStore(
    recording.subscribe,
    recording.getSnapshot,
    recording.getSnapshot,
  );
  return useMemo(
    () => ({
      state,
      prompt: consentPrompt(state),
      indicatorOn: isRecordingIndicatorOn(state),
      recordingHere: state.status === "local-starting" || state.status === "local-recording",
      requesting: state.status === "requesting",
      notice: state.status === "idle" ? state.notice : null,
      support: recording.support,
      request: recording.request,
      answer: recording.answer,
      withdraw: recording.withdraw,
      stop: recording.stop,
      dismissNotice: recording.dismissNotice,
    }),
    [state, recording],
  );
}
