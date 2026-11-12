// TJ-ARCH-MOB-001 compliant
// join.html `downloadIcs`: an RFC 5545 calendar file for an invite (one VEVENT,
// a 10-minute display alarm, lines folded at 75 octets, CRLF endings). Pure: the
// caller supplies the times, URL and dial-in text; the browser download lives in
// the presentation layer.
//
// Every caller-supplied value is untrusted (meeting titles and host names are
// user-entered), so values are encoded per RFC 5545 before they reach a content
// line: TEXT is escaped (§3.3.11), parameter values are DQUOTE-quoted (§3.2),
// URI values must be https (URL, LOCATION) or a plain mailto address (ORGANIZER),
// and no value can inject a line break or another property.

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

/** Octets per physical line, excluding the CRLF (RFC 5545 §3.1). */
const FOLD_OCTETS = 75;
/** Any line break: CRLF, lone LF or lone CR. */
const LINE_BREAK = /\r\n|\r|\n/g;
/** CONTROL characters other than HTAB (RFC 5545 §3.1 CONTROL). */
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point; they are invalid in iCalendar values.
const CONTROL = /[\u0000-\u0008\u000A-\u001F\u007F]/g;
/** A deliberately plain address: no whitespace, separators or extra `@`/`:`/`;`/`,`. */
const MAILBOX = /^[^\s@:;,"<>()\\[\]]+@[^\s@:;,"<>()\\[\]]+\.[^\s@:;,"<>()\\[\]]+$/;

function icsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** TEXT value (§3.3.11): escape `\ ; ,`, line breaks become `\n`, other controls dropped. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(LINE_BREAK, "\\n")
    .replace(CONTROL, "");
}

/** Parameter value (§3.2): DQUOTE-quoted; DQUOTE and controls cannot be represented, so they are dropped. */
export function quoteParam(value: string): string {
  return `"${value.replace(LINE_BREAK, " ").replace(CONTROL, "").replace(/"/g, "")}"`;
}

/** Returns the URL when it is an absolute https URL without credentials, else null. */
export function httpsUrl(value: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") return null;
  return parsed.href;
}

/** Folds at 75 octets of UTF-8 without splitting a character (§3.1). */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (octets + size > FOLD_OCTETS) {
      out.push(current);
      current = ` ${char}`; // the leading space of a continuation line counts toward its 75
      octets = 1 + size;
    } else {
      current += char;
      octets += size;
    }
  }
  out.push(current);
  return out.join("\r\n");
}

function organizerLine(organizer: IcsEvent["organizer"]): string | null {
  if (organizer === undefined) return null;
  const email = organizer.email.trim();
  if (!MAILBOX.test(email)) return null;
  return `ORGANIZER;CN=${quoteParam(organizer.name)}:mailto:${email}`;
}

export function buildIcs(event: IcsEvent): string {
  const url = httpsUrl(event.url);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KnowMe//Know Meet//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(`${event.uid}-${icsDate(event.start)}@knowme-meet`)}`,
    `DTSTAMP:${icsDate(event.stamp)}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    url === null ? null : `LOCATION:${escapeText(url)}`,
    url === null ? null : `URL:${url}`,
    organizerLine(event.organizer),
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
