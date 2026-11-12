// TJ-ARCH-MOB-001 compliant
// dashboard.html `parseInvitee` / `channelsFor` / `channelText`: an invitee is an
// email address or a phone number with country code; people already on file
// bring their other contact. Error copy names the problem, then the fix.
import type { Person } from "../../workspace/domain/workspace";
import type { DeliveryChannel, Invitee } from "./dashboard";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_SEPARATORS = /[\s().-]/g;
const LEADING_COUNTRY_ONE = /^\+?1?/;

function phoneDigits(value: string): string {
  return value.replace(PHONE_SEPARATORS, "");
}

function knownPersonFor(value: string, people: readonly Person[]): Person | null {
  const lower = value.toLowerCase();
  const digits = phoneDigits(value).replace(LEADING_COUNTRY_ONE, "");
  return (
    people.find(
      (p) =>
        p.email.toLowerCase() === lower ||
        (digits.length >= 10 && phoneDigits(p.phone).replace(LEADING_COUNTRY_ONE, "") === digits),
    ) ?? null
  );
}

export type InviteeParse =
  | { readonly ok: true; readonly invitee: Invitee }
  | { readonly ok: false; readonly error: string };

export function parseInvitee(raw: string, people: readonly Person[]): InviteeParse {
  const value = raw.trim();
  if (value === "") return { ok: false, error: "" };
  const known = knownPersonFor(value, people);
  if (EMAIL_RE.test(value)) {
    return {
      ok: true,
      invitee: {
        key: value.toLowerCase(),
        value,
        kind: "email",
        name: known ? known.name : value,
        email: value,
        phone: known ? known.phone : null,
      },
    };
  }
  let digits = phoneDigits(value);
  if (/^\+?\d+$/.test(digits)) {
    const bare = digits.replace(/^\+/, "");
    if (bare.length === 10 && !digits.startsWith("+")) digits = `+1${bare}`;
    else if (!digits.startsWith("+")) digits = `+${bare}`;
    if (bare.length < 10 || bare.length > 15) {
      return {
        ok: false,
        error: `“${value}” doesn’t look like a full phone number. Include the country code, like +1 415 555 0142.`,
      };
    }
    return {
      ok: true,
      invitee: {
        key: digits,
        value,
        kind: "phone",
        name: known ? known.name : value,
        email: known ? known.email : null,
        phone: digits,
      },
    };
  }
  if (value.includes("@")) {
    return {
      ok: false,
      error: `“${value}” isn’t a complete email address. Use the form name@company.com.`,
    };
  }
  return {
    ok: false,
    error: `“${value}” isn’t an email or phone number. Enter an address like name@company.com or a number with country code, like +1 415 555 0142.`,
  };
}

export function channelsFor(invitee: Invitee): readonly DeliveryChannel[] {
  const channels: DeliveryChannel[] = [];
  if (invitee.email) channels.push("email");
  if (invitee.phone) channels.push("sms");
  return channels;
}

export function channelText(invitee: Invitee): string {
  const channels = channelsFor(invitee);
  if (channels.length === 2) return "Email invite + SMS via Telnyx";
  return channels[0] === "sms" ? "SMS via Telnyx" : "Email invite";
}

/** Adds every comma/semicolon-separated entry; returns the kept list and what was rejected. */
export function commitInvitees(
  input: string,
  current: readonly Invitee[],
  people: readonly Person[],
): { readonly invitees: readonly Invitee[]; readonly rest: string; readonly error: string } {
  const parts = input
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
  let invitees = current;
  const rejected: { readonly value: string; readonly error: string }[] = [];
  for (const part of parts) {
    const parsed = parseInvitee(part, people);
    if (!parsed.ok) {
      rejected.push({ value: part, error: parsed.error });
      continue;
    }
    const next = parsed.invitee;
    const duplicate = invitees.some(
      (x) =>
        x.key === next.key ||
        (next.email !== null &&
          x.email !== null &&
          x.email.toLowerCase() === next.email.toLowerCase()),
    );
    if (duplicate) {
      rejected.push({ value: part, error: `“${part}” is already on the invite list.` });
      continue;
    }
    invitees = [...invitees, next];
  }
  return {
    invitees,
    rest: rejected.map((r) => r.value).join(", "),
    error: rejected[0]?.error ?? "",
  };
}
