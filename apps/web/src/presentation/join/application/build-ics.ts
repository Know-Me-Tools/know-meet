// TJ-ARCH-MOB-001 compliant
// join.html `downloadIcs`: an RFC 5545 calendar file for an invite (one VEVENT,
// a 10-minute display alarm, lines folded at 75 octets, CRLF endings). Pure: the
// caller supplies the times, URL and dial-in text; the browser download lives in
// the presentation layer.

export interface IcsEvent {
  readonly uid: string;
  readonly title: string;
  readonly start: Date;
  readonly end: Date;
  readonly stamp: Date;
  readonly url: string;
  readonly description: string;
  readonly organizer?: { readonly name: string; readonly email: string };
}

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KnowMe//Know Meet//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}-${icsDate(event.start)}@knowme-meet`,
    `DTSTAMP:${icsDate(event.stamp)}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.url)}`,
    `URL:${event.url}`,
    event.organizer === undefined
      ? null
      : `ORGANIZER;CN=${escapeText(event.organizer.name)}:mailto:${event.organizer.email}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(`${event.title} starts in 10 minutes`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines
    .filter((line): line is string => line !== null)
    .map(fold)
    .join("\r\n")}\r\n`;
}
