// TJ-ARCH-MOB-001 compliant
// The conferencing use cases (share, chat, audio start; later devices and effects)
// over the room the composition root provides. They hold no state of their own, only
// the room, so one instance per room is built here and kept for the room's lifetime.
// Presentation acts through these, never through the port (application
// conferencing-use-cases.ts). If the composition root later provides them on
// `services.meeting`, this hook becomes a read of that field.
import { type ConferencingUseCases, createConferencingUseCases } from "@know-meet/application";
import { useMemo } from "react";
import type { MeetingServicesView } from "../../guest-meeting/meeting-services";

export function useConferencing(services: MeetingServicesView): ConferencingUseCases {
  const { room } = services;
  return useMemo(() => createConferencingUseCases(room), [room]);
}
