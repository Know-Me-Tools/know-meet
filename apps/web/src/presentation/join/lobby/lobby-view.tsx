// TJ-ARCH-MOB-001 compliant
// prototype meet.html `#lobby` (`.lobby-main`: preview card beside the info column, stacked
// below 1024) with the live share card (acceptance L1-L6e). DOM order follows 5.2, also at
// 375 where the preview stacks first: toggles, share card copy buttons, name, Join meeting,
// Cancel. No autofocus on load: the browser permission prompt owns attention. A code the
// service never issued replaces the lobby with the not-found view (L7), which releases
// the camera and microphone. The device pickers list the room's device list, which the
// lazy room keeps before any connection (wc05); it is re-read once the preview has
// permission, because only then does the browser give device labels.
import type { DeviceId, MediaDevice, TrackKind } from "@know-meet/domain";
import { useEffect } from "react";
import { deviceChanged } from "../../guest-meeting/devices/device-copy";
import { deviceLabel, shownDeviceId } from "../../guest-meeting/devices/device-options";
import { type Announce, LiveStatus, useAnnouncer } from "../../guest-meeting/live-status";
import { LOBBY_COPY } from "../../guest-meeting/meeting-copy";
import type { LobbyRole } from "../../guest-meeting/meeting-routes";
import { useMeetingServices, useRoomSnapshot } from "../../guest-meeting/meeting-services";
import { ShareCard } from "../../guest-meeting/share-card";
import { eyebrowClass, h1Class } from "../../public-shared/ui-classes";
import { useField } from "../../public-shared/use-field";
import { useDocumentTitle } from "../../shared/use-document-title";
import { LobbyJoinForm } from "./lobby-join-form";
import { LobbyPreview } from "./lobby-preview";
import { MeetingNotFoundView } from "./meeting-not-found-view";
import { type PreviewEvents, useDevicePreview } from "./use-device-preview";
import { useJoinMeeting } from "./use-join-meeting";

interface LobbyViewProps {
  readonly code: string;
  readonly role: LobbyRole;
}

/** "Microphone changed to <label>." once the preview has opened the newly picked device. */
function switchAnnouncer(devices: readonly MediaDevice[], announce: Announce): PreviewEvents {
  return {
    switched: (kind: TrackKind, id: DeviceId | null) =>
      announce(deviceChanged(kind, deviceLabel(devices, kind, shownDeviceId(devices, kind, id)))),
  };
}

export function LobbyView({ code, role }: LobbyViewProps) {
  const { room } = useMeetingServices();
  const devices = useRoomSnapshot(room).devices.available;
  const { message, announce } = useAnnouncer();
  const preview = useDevicePreview(switchAnnouncer(devices, announce));
  const { outcome, join } = useJoinMeeting(code, preview);
  const name = useField((value) => (value === "" ? LOBBY_COPY.nameEmpty : ""));
  const granted = preview.stream !== null;
  useEffect(() => {
    // Never prompts; permission was just given, so the list now carries labels.
    if (granted) void room.refreshDevices();
  }, [granted, room]);
  const notFound = outcome.kind === "not-found";
  useDocumentTitle(notFound ? "Meeting not found — Know Meet" : `Meeting ${code} — Know Meet`);

  if (notFound) return <MeetingNotFoundView tried={code} />;

  return (
    <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-start gap-s7 max-bp1024:grid-cols-[minmax(0,1fr)] max-bp1024:gap-s6">
      <LobbyPreview preview={preview} devices={devices} name={name.value} announce={announce} />
      <section aria-labelledby="lobby-title" className="grid min-w-0 gap-s5">
        <div className="grid gap-s2">
          <span className={eyebrowClass}>
            {role === "starter" ? "Your new meeting" : "You’re joining"}
          </span>
          <h1 id="lobby-title" className={h1Class}>
            Meeting {code}
          </h1>
        </div>
        <ShareCard code={code} line={LOBBY_COPY.shareLine} announce={announce} />
        <LobbyJoinForm name={name} outcome={outcome} onJoin={join} />
      </section>
      <LiveStatus message={message} />
    </div>
  );
}
