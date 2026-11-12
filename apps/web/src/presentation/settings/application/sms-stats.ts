// TJ-ARCH-MOB-001 compliant
// settings.html `smsStats` and the template `fill`: GSM-7 messages split at
// 160/153 characters per segment, anything else at 70/67.
import { formatDay, formatTime } from "../../workspace/application/format";
import type { Meeting } from "../../workspace/domain/workspace";
import type { SmsStats } from "../domain/settings";

export function smsStats(text: string): SmsStats {
  const gsm = /^[\x20-\x7E\n]*$/.test(text);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  const segments = text.length <= single ? 1 : Math.ceil(text.length / multi);
  return { length: text.length, segments, limit: segments === 1 ? single : multi * segments, gsm };
}

/** Replaces {meeting}, {host} and {date} with the sample meeting's values. */
export function fillTemplate(template: string, meeting: Meeting): string {
  return template
    .replace(/\{meeting\}/g, meeting.title)
    .replace(/\{host\}/g, meeting.host)
    .replace(/\{date\}/g, `${formatDay(meeting.start)} ${formatTime(meeting.start)}`);
}
