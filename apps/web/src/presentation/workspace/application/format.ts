// TJ-ARCH-MOB-001 compliant
// km.js `fmt`: the prototype's display formats, ported verbatim (local time,
// en-US month/day names, 12-hour clock).
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const DAY_MS = 86_400_000;

type DateInput = Date | string;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatBytes(bytes: number): string {
  let n = Number.isFinite(bytes) ? bytes : 0;
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"] as const;
  let i = -1;
  do {
    n /= 1024;
    i++;
  } while (n >= 1024 && i < units.length - 1);
  return `${n >= 100 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

/** mm:ss, or h:mm:ss when at least one hour. */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/** "46 min" / "1 h 12 min". */
export function formatMinutes(minutes: number): string {
  const min = Math.round(Number.isFinite(minutes) ? minutes : 0);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`;
}

export function formatTime(value: DateInput): string {
  const d = toDate(value);
  const h = d.getHours();
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
}

export function formatDay(value: DateInput): string {
  const d = toDate(value);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Mon, Oct 20 · 10:00 AM". */
export function formatDate(value: DateInput): string {
  return `${formatDay(value)} · ${formatTime(value)}`;
}

/** "Today" / "Tomorrow" / "Yesterday" / "Mon, Oct 20", relative to `now`. */
export function formatRelativeDay(value: DateInput, now: Date): string {
  const a = new Date(now.getTime());
  a.setHours(0, 0, 0, 0);
  const b = new Date(toDate(value).getTime());
  b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / DAY_MS);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDay(value);
}

export function formatNumber(n: number): string {
  return String(Math.round(Number.isFinite(n) ? n : 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** km.js `initials`: first and last word initials, uppercase; "?" when empty. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part !== "");
  const first = parts[0];
  if (first === undefined) return "?";
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}
