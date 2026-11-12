// TJ-ARCH-MOB-001 compliant
// /join (c10 10.3): the invitee flow, four hash states from route-inventory.json /
// app-state-map.json: #invite (default), #waiting, #expired and #wrong-code.
// Params: `code` (or `meeting`) picks the meeting, `via` marks how the invite
// arrived, `name`/`cam`/`mic` carry the waiting-room guest. As in the prototype,
// an unknown code redirects to #wrong-code and an ended meeting renders #expired.
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  buildSampleMeetings,
  DEFAULT_INVITE_MEETING_ID,
  findByCode,
  findById,
  meetingStatus,
  type SampleMeeting,
} from "../public-shared/sample-meetings";
import { useDocumentTitle } from "../shared/use-document-title";
import { toHash, useHashRoute } from "../shared/use-hash-route";
import { InviteView } from "./invite-view";
import { ExpiredView, WaitingView, WrongCodeView } from "./status-views";

type JoinView = "invite" | "waiting" | "expired" | "wrong-code";

function toView(view: string): JoinView {
  return view === "waiting" || view === "expired" || view === "wrong-code" ? view : "invite";
}

function resolveMeeting(meetings: readonly SampleMeeting[], params: Readonly<Record<string, string>>): SampleMeeting {
  const code = params["code"];
  const id = params["meeting"];
  const byCode = code === undefined ? null : findByCode(meetings, code.toLowerCase());
  const byId = byCode === null && id !== undefined ? findById(meetings, id) : null;
  const fallback = findById(meetings, DEFAULT_INVITE_MEETING_ID);
  const meeting = byCode ?? byId ?? fallback ?? meetings[0];
  if (meeting === undefined) throw new Error("Sample meetings are empty");
  return meeting;
}

function title(view: JoinView, meeting: SampleMeeting, ended: boolean): string {
  if (view === "waiting") return "Waiting for the host — Know Meet";
  if (view === "wrong-code") return "Code not found — Know Meet";
  if (view === "expired" || ended) return "Meeting ended — Know Meet";
  return `You’re invited: ${meeting.title} — Know Meet`;
}

export function JoinScreen() {
  const navigate = useNavigate();
  const route = useHashRoute();
  const [now] = useState(() => new Date());
  const meetings = useMemo(() => buildSampleMeetings(now), [now]);
  const view = toView(route.view);
  const params = route.params;
  const meeting = resolveMeeting(meetings, params);
  const codeParam = params["code"];
  const unknownCode = view === "invite" && codeParam !== undefined && findByCode(meetings, codeParam.toLowerCase()) === null;
  const ended = view === "invite" && meetingStatus(meeting, now) === "ended";

  useEffect(() => {
    if (!unknownCode) return;
    void navigate({ to: "/join", hash: toHash("wrong-code", undefined, { code: codeParam ?? "" }), replace: true });
  }, [unknownCode, navigate, codeParam]);

  useDocumentTitle(title(view, meeting, ended));

  const content = (() => {
    switch (view) {
      case "waiting":
        return (
          <WaitingView
            meeting={meeting}
            guestName={(params["name"] ?? "").slice(0, 80) || "Guest"}
            camera={params["cam"] !== "0"}
            mic={params["mic"] !== "0"}
          />
        );
      case "expired": {
        const code = params["code"];
        const id = params["meeting"];
        const explicit =
          (code === undefined ? null : findByCode(meetings, code.toLowerCase())) ??
          (id === undefined ? null : findById(meetings, id));
        return <ExpiredView meeting={explicit} meetings={meetings} />;
      }
      case "wrong-code":
        return <WrongCodeView tried={(params["code"] ?? "").toLowerCase().slice(0, 20)} meetings={meetings} />;
      default:
        if (unknownCode) return null;
        if (ended) return <ExpiredView meeting={meeting} meetings={meetings} />;
        return <InviteView meeting={meeting} status={meetingStatus(meeting, now)} now={now} via={params["via"]} />;
    }
  })();

  return (
    <div className="mx-auto w-full max-w-[1120px] px-s5 pt-s5 pb-s8 max-bp768:px-s4">
      {content}
    </div>
  );
}
