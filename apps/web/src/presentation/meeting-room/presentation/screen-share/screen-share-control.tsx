// TJ-ARCH-MOB-001 compliant
// meet.html `#ctl-share` (WC-1): "Share" starts sharing a screen, window or tab through
// the browser's own picker; while sharing it reads "Stop sharing" and takes the active
// tone. `data-state` is "on" while this participant shares (scenario contract
// km-room-share-screen). Where the browser has no screen capture (support.screenShare,
// most phone browsers) the control stays in place but unavailable: aria-disabled, its
// reason linked by aria-describedby, and a press announces that reason instead of
// offering a share that would fail.
import { useId } from "react";
import { Ctl } from "../room-control";
import { SHARE_COPY } from "./screen-share-copy";

export interface ScreenShareControlProps {
  readonly sharing: boolean;
  readonly available: boolean;
  /** True while the browser's picker is open or a stop is in flight. */
  readonly busy: boolean;
  readonly onToggle: () => void;
}

export function ScreenShareControl({
  sharing,
  available,
  busy,
  onToggle,
}: ScreenShareControlProps) {
  const reasonId = useId();
  return (
    <>
      <Ctl
        icon="screen"
        label={sharing ? "Stop sharing" : "Share"}
        aria-label={sharing ? "Stop sharing your screen" : "Share your screen"}
        tone={sharing ? "active" : "rest"}
        data-testid="km-room-share-screen"
        data-state={sharing ? "on" : "off"}
        aria-disabled={available ? undefined : true}
        aria-describedby={available ? undefined : reasonId}
        aria-busy={busy ? true : undefined}
        onClick={onToggle}
      />
      {available ? null : (
        <span id={reasonId} className="sr-only">
          {SHARE_COPY.unsupported}
        </span>
      )}
    </>
  );
}
