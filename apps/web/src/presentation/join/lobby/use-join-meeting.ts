// TJ-ARCH-MOB-001 compliant
// Join meeting (acceptance L6, L6e, L7): releases the preview so the meeting connection
// can open the devices, then runs the join use case (name and code check, token request,
// connect, device choices). Success opens the room; a code the service never issued shows
// the not-found view and never connects (WR-1 negative control); other failures show the
// lobby error card and bring the preview back. A join that finishes after the lobby has
// unmounted (Back or Home pressed while joining) does not navigate, and leaves if it connected.
import type { JoinError } from "@know-meet/application";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { roomHash } from "../../guest-meeting/meeting-routes";
import { useMeetingServices } from "../../guest-meeting/meeting-services";
import type { DevicePreview } from "./use-device-preview";

export type JoinOutcome =
  | { readonly kind: "idle" }
  | { readonly kind: "joining" }
  | { readonly kind: "not-found" }
  | { readonly kind: "invalid-name" }
  | { readonly kind: "failed"; readonly error: JoinError };

export interface JoinMeeting {
  readonly outcome: JoinOutcome;
  readonly join: (displayName: string) => void;
}

export function useJoinMeeting(code: string, preview: DevicePreview): JoinMeeting {
  const { useCases } = useMeetingServices();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<JoinOutcome>({ kind: "idle" });
  const inFlight = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { wishes, release, resume } = preview;

  const join = useCallback(
    (displayName: string) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setOutcome({ kind: "joining" });
      release();
      const request = {
        code,
        displayName,
        microphoneEnabled: wishes.microphone,
        cameraEnabled: wishes.camera,
      };
      void useCases.join(request).then((result) => {
        inFlight.current = false;
        if (!mounted.current) {
          if (result.ok) void useCases.leave();
          return;
        }
        if (result.ok) {
          void navigate({
            to: "/meet",
            hash: roomHash(result.value.code, result.value.deniedDevices),
          });
          return;
        }
        const { error } = result;
        if (error.code === "meeting-not-found") {
          setOutcome({ kind: "not-found" });
          return;
        }
        resume();
        setOutcome(
          error.code === "invalid-request" ? { kind: "invalid-name" } : { kind: "failed", error },
        );
      });
    },
    [code, wishes.microphone, wishes.camera, release, resume, useCases, navigate],
  );

  return { outcome, join };
}
