// TJ-ARCH-MOB-001 compliant
// Browser-side invite actions: the invite URL, the .ics download and clipboard
// copy. Each returns the sentence to announce, so the screen's polite status line
// tells every user what happened (or what to do instead) without a toast.
import { type DialInNumber, hostOf, meetingEnd, type SampleMeeting } from "../public-shared/sample-meetings";
import { buildIcs } from "./application/build-ics";

export function inviteUrl(meeting: SampleMeeting): string {
  return `${window.location.origin}/join#invite?code=${encodeURIComponent(meeting.joinCode)}`;
}

export function dialInSummary(meeting: SampleMeeting, numbers: readonly DialInNumber[]): string {
  return `${meeting.title}\n${numbers.map((d) => `${d.region}: ${d.number}`).join("\n")}\nPIN: ${meeting.pin}#`;
}

export function downloadInviteIcs(meeting: SampleMeeting, numbers: readonly DialInNumber[]): string {
  const host = hostOf(meeting);
  const url = inviteUrl(meeting);
  const dial = numbers.map((d) => `${d.region} ${d.number}`).join(" / ");
  const description =
    `${host.name} invited you to a Know Meet meeting.\n\nJoin in your browser: ${url}` +
    `\n\nJoin by phone (audio only): ${dial}\nPIN: ${meeting.pin}#` +
    "\n\nThis meeting may be recorded and transcribed. A transcript and summary are sent to participants after it ends.";
  const ics = buildIcs({
    uid: meeting.id,
    title: meeting.title,
    start: meeting.start,
    end: meetingEnd(meeting),
    stamp: new Date(),
    url,
    description,
    ...(host.email === "" ? {} : { organizer: { name: host.name, email: host.email } }),
  });
  try {
    const href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${meeting.id}.ics`;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    return "Calendar file downloaded — open it to add the meeting.";
  } catch (error) {
    reportError(error);
    return "Couldn’t create the calendar file in this browser. Copy the link instead.";
  }
}

export async function copyText(text: string, what: string): Promise<string> {
  try {
    await navigator.clipboard.writeText(text);
    return `${what} copied.`;
  } catch (error) {
    reportError(error);
    return `Couldn’t copy the ${what.toLowerCase()} in this browser. Select it and copy it instead.`;
  }
}
