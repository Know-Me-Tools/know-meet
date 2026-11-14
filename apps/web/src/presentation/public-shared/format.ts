// TJ-ARCH-MOB-001 compliant
// km.js `fmt`: the prototype's date, time and duration wording (en-US, 12-hour).
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const DAY_MS = 86_400_000;

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** "10:00 AM" */
export function formatTime(date: Date): string {
  const hours = date.getHours();
  return `${hours % 12 || 12}:${pad(date.getMinutes())} ${hours < 12 ? "AM" : "PM"}`;
}

/** "Mon, Oct 20" */
export function formatDay(date: Date): string {
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** "Mon, Oct 20 · 10:00 AM" */
export function formatDate(date: Date): string {
  return `${formatDay(date)} · ${formatTime(date)}`;
}

/** "Today" / "Tomorrow" / "Yesterday" / "Mon, Oct 20", relative to `now`. */
export function formatRelativeDay(date: Date, now: Date): string {
  const a = new Date(now.getTime());
  a.setHours(0, 0, 0, 0);
  const b = new Date(date.getTime());
  b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / DAY_MS);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDay(date);
}

/** "46 min" / "1 h 12 min" */
export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const rest = rounded % 60;
  return `${Math.floor(rounded / 60)} h${rest ? ` ${rest} min` : ""}`;
}

/** "Avery Chen" → "AC" (first and last word). */
export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part !== "");
  const picked = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return picked.map((part) => (part ?? "").charAt(0).toUpperCase()).join("");
}
