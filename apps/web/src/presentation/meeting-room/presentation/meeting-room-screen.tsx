// TJ-ARCH-MOB-001 compliant
// /meet (wr05 5.3): the guest meeting room, driven by the RealtimeRoom snapshot. The lobby
// joins (token, connect, devices) and then opens `/meet#room:<code>`; this screen only reads
// the room and acts through the use cases. RoomLayout gives it <main id="main"> and no app
// bar. Views: in the room while connecting, connected or reconnecting (R0-R6); "You were
// disconnected" when the connection could not be restored (R7); "You left the meeting"
// after Leave, or with the reload line when this page load never joined (R8; a reload ends
// the media session). The root carries `km-screen-meet` in every view.
// Leaving this screen any other way (browser Back, a typed URL) also leaves the meeting, so a
// guest is never left publishing camera and microphone from a page that no longer shows the room.
import { isInRoom } from "@know-meet/domain";
import type * as React from "react";
import { useEffect, useRef } from "react";
import { readBlockedDevices, readRoomCode } from "../../guest-meeting/meeting-routes";
import { useMeetingServices, useRoomSnapshot } from "../../guest-meeting/meeting-services";
import { useDocumentTitle } from "../../shared/use-document-title";
import { useHashRoute } from "../../shared/use-hash-route";
import { type EndReason, RoomEndView } from "./room-end-view";
import { RoomView } from "./room-view";

function endReason(status: string, reason: string | null, code: string | null): EndReason {
  if (status === "disconnected") return reason === "connection-lost" ? "disconnected" : "left";
  return code === null ? "no-meeting" : "reloaded";
}

/**
 * Leaves the meeting when the room screen unmounts while the session is live. The leave is
 * deferred one tick and cancelled by a re-mount, because React StrictMode (development) runs
 * cleanup and setup back to back on the same instance. The state is read from the room at that
 * moment, so a normal Leave (already disconnected) does nothing here.
 */
function useLeaveOnUnmount(services: ReturnType<typeof useMeetingServices>): void {
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (pending.current !== null) {
      clearTimeout(pending.current);
      pending.current = null;
    }
    return () => {
      pending.current = setTimeout(() => {
        pending.current = null;
        const { connection } = services.room.getSnapshot();
        if (isInRoom(connection) || connection.status === "connecting") {
          void services.useCases.leave();
        }
      }, 0);
    };
  }, [services]);
}

export function MeetingRoomScreen({ themeControl }: { readonly themeControl: React.ReactNode }) {
  const services = useMeetingServices();
  const snapshot = useRoomSnapshot(services.room);
  const route = useHashRoute();
  const code = readRoomCode(route);
  const { connection } = snapshot;
  const live = code !== null && (isInRoom(connection) || connection.status === "connecting");
  useDocumentTitle(code === null ? "Meeting — Know Meet" : `Meeting ${code} — Know Meet`);
  useLeaveOnUnmount(services);

  return (
    <div data-testid="km-screen-meet">
      {live ? (
        <RoomView
          services={services}
          snapshot={snapshot}
          code={code}
          blockedAtJoin={readBlockedDevices(route)}
          themeControl={themeControl}
        />
      ) : (
        <RoomEndView
          reason={endReason(
            connection.status,
            connection.status === "disconnected" ? connection.reason : null,
            code,
          )}
          code={code}
          themeControl={themeControl}
        />
      )}
    </div>
  );
}
