// TJ-ARCH-MOB-001 compliant
import type { RecordingRequestId } from "@know-meet/domain";
import { useEffect, useState } from "react";
import type { PlaybackSource } from "../../../infrastructure/recording";
import { useAppServices } from "../../app-services";

/**
 * - `idle`: no recording selected.
 * - `loading`: opening the file.
 * - `ready`: `url` plays; it is revoked when another recording is chosen or the screen unmounts.
 * - `missing`: the file is gone (the recording can only be deleted from the list).
 * - `recording`: a tab is still writing it; it can be played once it ends.
 * - `failed`: opening it failed for another reason.
 */
export type RecordingPlayback =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly url: string; readonly mimeType: string }
  | { readonly status: "missing" | "recording" | "failed" };

const IDLE: RecordingPlayback = { status: "idle" };
const LOADING: RecordingPlayback = { status: "loading" };

/**
 * Opens one recording for playback as an object URL of the OPFS file; nothing is copied or
 * uploaded. The URL is revoked on unmount and whenever the id changes. A playback error
 * the player itself reports (a file cut off mid-write) is the screen's to show.
 */
export function useRecordingPlayback(id: RecordingRequestId | null): RecordingPlayback {
  const { recordings } = useAppServices();
  const [state, setState] = useState<RecordingPlayback>(IDLE);

  useEffect(() => {
    if (id === null) {
      setState(IDLE);
      return undefined;
    }
    let cancelled = false;
    let source: PlaybackSource | null = null;
    setState(LOADING);
    void recordings.library.openPlayback(id).then((opened) => {
      if (cancelled) {
        if (opened.ok) opened.value.revoke();
        return;
      }
      if (opened.ok) {
        source = opened.value;
        setState({ status: "ready", url: opened.value.url, mimeType: opened.value.mimeType });
        return;
      }
      const code = opened.error.code;
      setState({
        status:
          code === "recording-file-missing"
            ? "missing"
            : code === "recording-in-progress"
              ? "recording"
              : "failed",
      });
    });
    return () => {
      cancelled = true;
      source?.revoke();
    };
  }, [recordings, id]);

  return state;
}
