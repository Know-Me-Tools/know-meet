// TJ-ARCH-MOB-001 compliant
// meet.html `#ctl-rec` for the local recording (wc10 task 10.4, WC-8, WC-9): in the
// media group after Share, as in the prototype. "Record" asks everyone to agree; while
// the request waits it reads "Cancel" and withdraws it; while this browser records it
// reads "Stop rec", takes the active tone and stops on one press (what was written is
// kept, so no confirmation; scenario contract `km-room-record`, `data-state` "on" only
// while this browser records). When another recording or question is open, or the
// browser cannot record, the control keeps its tab stop but is unavailable
// (aria-disabled, reason linked by aria-describedby); a press announces the reason.
import { useId, useRef } from "react";
import { Ctl } from "../room-control";
import { RECORD_COPY } from "./recording-copy";
import type { RecordAction } from "./use-recording-ui";

interface RecordControlProps {
  readonly action: RecordAction;
  readonly onPress: () => void;
}

export function RecordControl({ action, onPress }: RecordControlProps) {
  const reasonId = useId();
  const pressedStop = useRef<{ source: "pointer" | "key"; stop: () => void } | null>(null);
  const recording = action.kind === "stop";
  const label =
    action.kind === "stop"
      ? RECORD_COPY.controlStop
      : action.kind === "withdraw"
        ? RECORD_COPY.controlCancel
        : RECORD_COPY.controlRecord;
  const name =
    action.kind === "stop"
      ? RECORD_COPY.controlStopName
      : action.kind === "withdraw"
        ? RECORD_COPY.controlCancelName
        : RECORD_COPY.controlRecordName;
  const blocked = action.kind === "blocked";
  return (
    <>
      <Ctl
        icon={recording ? "stop" : "record"}
        label={label}
        aria-label={name}
        tone={recording ? "active" : "rest"}
        data-testid="km-room-record"
        data-state={recording ? "on" : "off"}
        aria-disabled={blocked ? true : undefined}
        aria-describedby={blocked ? reasonId : undefined}
        onPointerDown={(event) => {
          pressedStop.current =
            recording && event.isPrimary && event.button === 0
              ? { source: "pointer", stop: onPress }
              : null;
        }}
        onPointerCancel={() => {
          pressedStop.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          if (event.repeat) {
            event.preventDefault();
            return;
          }
          pressedStop.current = recording ? { source: "key", stop: onPress } : null;
        }}
        onBlur={() => {
          pressedStop.current = null;
        }}
        onClick={(event) => {
          // An encoder failure can change the button back to Record while Stop is pressed.
          const pressed = pressedStop.current;
          pressedStop.current = null;
          if (pressed?.source === (event.detail === 0 ? "key" : "pointer")) pressed.stop();
          else onPress();
        }}
      />
      {blocked ? (
        <span id={reasonId} className="sr-only">
          {action.reason}
        </span>
      ) : null}
    </>
  );
}
