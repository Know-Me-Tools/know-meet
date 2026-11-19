// TJ-ARCH-MOB-001 compliant
// State of the Background section (wc07 task 7.3; background-effects shape, "States").
// A choice checks at once and is requested through the conferencing use case; the room's
// requested effect is then the source of truth. While the processor loads the section is
// busy ("Loading background effects…"); with the camera off the choice waits for it. A
// processor that fails to start leaves the camera as captured: the selection returns to
// None (the request is withdrawn) and the failure line stays until the next choice.
// "Background: Blur." is announced politely once a choice is accepted.
import type { ConferencingUseCases } from "@know-meet/application";
import { type BackgroundEffectState, NO_BACKGROUND_EFFECT } from "@know-meet/domain";
import { useCallback, useState } from "react";
import type { Announce } from "../../../guest-meeting/live-status";
import { type BackgroundChoiceId, choiceById, choiceOfEffect } from "./background-options";

export type BackgroundStatus = "none" | "loading" | "camera-off" | "failed";

export interface BackgroundChoiceState {
  readonly checked: BackgroundChoiceId;
  readonly status: BackgroundStatus;
  readonly choose: (id: string) => void;
}

export function useBackgroundChoice(
  state: BackgroundEffectState,
  cameraOn: boolean,
  conferencing: ConferencingUseCases,
  announce: Announce,
): BackgroundChoiceState {
  const [picked, setPicked] = useState<BackgroundChoiceId | null>(null);
  const [failed, setFailed] = useState(false);
  const requested = choiceOfEffect(state.effect)?.id ?? "none";
  const checked = failed ? "none" : (picked ?? requested);

  const choose = useCallback(
    (id: string) => {
      const choice = choiceById(id);
      if (choice === null) return;
      setPicked(choice.id);
      setFailed(false);
      void conferencing.setBackgroundEffect(choice.effect).then((result) => {
        // A later choice replaced this one; its own result speaks for it.
        setPicked((current) => (current === choice.id ? null : current));
        if (result.ok) {
          announce(`Background: ${choice.name}.`);
          return;
        }
        if (result.error.code === "effect-failed") {
          setFailed(true);
          void conferencing.setBackgroundEffect(NO_BACKGROUND_EFFECT);
        }
      });
    },
    [conferencing, announce],
  );

  const waiting = state.status === "pending" || state.status === "applying";
  const status: BackgroundStatus = failed
    ? "failed"
    : checked !== "none" && !cameraOn
      ? "camera-off"
      : checked !== "none" && (waiting || picked !== null)
        ? "loading"
        : "none";

  return { checked, status, choose };
}
