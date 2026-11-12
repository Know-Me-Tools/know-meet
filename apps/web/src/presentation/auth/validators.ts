// TJ-ARCH-MOB-001 compliant
// auth.html field rules and copy. Each message names the problem and the fix (F9).
// Pure functions on the trimmed value; the views decide when they run (blur, submit).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 80;
const PASSWORD_MIN = 10;

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function emailError(value: string): string {
  if (value === "") return "Enter your email address.";
  if (!isEmail(value)) return "Enter an email like name@company.com — it needs an @ and a domain.";
  return "";
}

/** Magic link without an email: say why the email is needed. */
export function magicLinkEmailError(value: string): string {
  return value === "" ? "Enter your email first so we know where to send the sign-in link." : emailError(value);
}

export function signInPasswordError(value: string): string {
  return value === "" ? "Enter your password. It’s case-sensitive." : "";
}

export function fullNameError(value: string): string {
  if (value === "") return "Enter your name as you’d like others in the meeting to see it.";
  return value.length > NAME_MAX ? `Use ${NAME_MAX} characters or fewer.` : "";
}

export interface PasswordRules {
  readonly length: boolean;
  readonly number: boolean;
}

export function passwordRules(value: string): PasswordRules {
  return { length: value.length >= PASSWORD_MIN, number: /\d/.test(value) };
}

export function newPasswordError(value: string): string {
  if (value === "") return `Create a password with at least ${PASSWORD_MIN} characters, including a number.`;
  const rules = passwordRules(value);
  if (!rules.length) {
    const missing = PASSWORD_MIN - value.length;
    return `Add ${missing} more character${missing === 1 ? "" : "s"} — passwords need at least ${PASSWORD_MIN}.`;
  }
  return rules.number ? "" : "Add at least one number (0–9).";
}

export const TERMS_ERROR = "Agree to the terms to create your account.";

/** A safe display address from a hash param, else the sample account (km.js). */
export function addressOr(value: string | undefined, fallback: string): string {
  return value !== undefined && isEmail(value) ? value : fallback;
}
