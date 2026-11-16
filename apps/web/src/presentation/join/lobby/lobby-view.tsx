// TJ-ARCH-MOB-001 compliant
// prototype meet.html `#lobby` (`.lobby-main`: preview card beside the info column, stacked
// below 1024) with the live share card (acceptance L1-L6e). DOM order follows 5.2, also at
// 375 where the preview stacks first: toggles, share card copy buttons, name, Join meeting,
// Cancel. No autofocus on load: the browser permission prompt owns attention. A code the
// service never issued replaces the lobby with the not-found view (L7), which releases
// the camera and microphone.
import { LiveStatus, useAnnouncer } from "../../guest-meeting/live-status";
import { LOBBY_COPY } from "../../guest-meeting/meeting-copy";
import type { LobbyRole } from "../../guest-meeting/meeting-routes";
import { ShareCard } from "../../guest-meeting/share-card";
import { eyebrowClass, h1Class } from "../../public-shared/ui-classes";
import { useField } from "../../public-shared/use-field";
import { useDocumentTitle } from "../../shared/use-document-title";
import { LobbyJoinForm } from "./lobby-join-form";
import { LobbyPreview } from "./lobby-preview";
import { MeetingNotFoundView } from "./meeting-not-found-view";
import { useDevicePreview } from "./use-device-preview";
import { useJoinMeeting } from "./use-join-meeting";

interface LobbyViewProps {
  readonly code: string;
  readonly role: LobbyRole;
}

export function LobbyView({ code, role }: LobbyViewProps) {
  const preview = useDevicePreview();
  const { outcome, join } = useJoinMeeting(code, preview);
  const name = useField((value) => (value === "" ? LOBBY_COPY.nameEmpty : ""));
  const { message, announce } = useAnnouncer();
  const notFound = outcome.kind === "not-found";
  useDocumentTitle(notFound ? "Meeting not found — Know Meet" : `Meeting ${code} — Know Meet`);

  if (notFound) return <MeetingNotFoundView tried={code} />;

  return (
    <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-start gap-s7 max-bp1024:grid-cols-[minmax(0,1fr)] max-bp1024:gap-s6">
      <LobbyPreview preview={preview} name={name.value} announce={announce} />
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
