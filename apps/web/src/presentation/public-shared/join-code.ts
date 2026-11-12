// TJ-ARCH-MOB-001 compliant
// Meeting join codes (home "Join with a code", join wrong-code and expired forms):
// km-xxx-xxx, lower-case letters and digits. Error copy names the problem and the
// fix (F9), never a code or a regex.
const CODE_PATTERN = /^km-[a-z0-9]{3}-[a-z0-9]{3}$/;

export const CODE_EXAMPLE = "km-4fq-82x";
export const CODE_MAX_LENGTH = 20;

/** Trims, lower-cases and drops inner spaces, as the prototype does. */
export function normalizeCode(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/** Format check. `required` adds the empty-field message (submit only). */
export function codeFormatError(code: string, required: boolean): string {
  if (code === "") return required ? `Enter the code from your invite, for example ${CODE_EXAMPLE}.` : "";
  if (!CODE_PATTERN.test(code)) {
    return `Codes look like ${CODE_EXAMPLE}: “km”, then two groups of three letters or numbers, joined by hyphens.`;
  }
  return "";
}

export function unknownCodeError(code: string): string {
  return `No meeting uses ${code}. Check each character against your invite — 0 and o, or 1 and l, are easy to mix up.`;
}
