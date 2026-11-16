// TJ-ARCH-MOB-001 compliant
// /join (wr05 5.2): the join lobby for the room code in the hash (meeting-routes.ts).
// `#start:<code>` comes from "Start a meeting", `#join:<code>` from "Join" or a shared
// link. A code that cannot be a room code shows the not-found view at once, without
// touching the camera or the token service; a bare /join asks for a code. The screen
// root carries `km-screen-join` in every state. The lobby is keyed by code so a new code
// (from the not-found form) starts a fresh lobby.
import { parseRoomCode } from "@know-meet/domain";
import { readLobbyLocation } from "../guest-meeting/meeting-routes";
import { useHashRoute } from "../shared/use-hash-route";
import { LobbyView } from "./lobby/lobby-view";
import { MeetingNotFoundView } from "./lobby/meeting-not-found-view";

export function JoinScreen() {
  const location = readLobbyLocation(useHashRoute());
  const code = location === null ? null : parseRoomCode(location.code);

  const content = (() => {
    if (location === null) return <MeetingNotFoundView tried="" />;
    if (code === null) return <MeetingNotFoundView tried={location.code.slice(0, 20)} />;
    return <LobbyView key={`${location.role}:${code}`} code={code} role={location.role} />;
  })();

  return (
    <div
      data-testid="km-screen-join"
      className="mx-auto w-full max-w-[1120px] px-s5 pt-s5 pb-s8 max-bp768:px-s4"
    >
      {content}
    </div>
  );
}
