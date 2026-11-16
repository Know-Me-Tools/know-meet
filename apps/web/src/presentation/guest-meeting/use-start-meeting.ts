// TJ-ARCH-MOB-001 compliant
// "Start a meeting" (home H1/H2/H2e, lobby not-found, room "Start a new meeting"): asks the
// token service for a new code through the start use case, then opens the lobby for it.
// The name is entered in the lobby only. A second press while busy does nothing.
import type { CreateMeetingError } from "@know-meet/application";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { lobbyHash } from "./meeting-routes";
import { useMeetingServices } from "./meeting-services";

export interface StartMeeting {
  readonly busy: boolean;
  readonly error: CreateMeetingError | null;
  readonly start: () => void;
}

export function useStartMeeting(): StartMeeting {
  const { useCases } = useMeetingServices();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CreateMeetingError | null>(null);
  const inFlight = useRef(false);

  const start = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    void useCases.start().then((result) => {
      inFlight.current = false;
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      void navigate({ to: "/join", hash: lobbyHash(result.value, "starter") });
    });
  }, [useCases, navigate]);

  return { busy, error, start };
}
