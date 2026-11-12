// TJ-ARCH-MOB-001 compliant
// settings.html field validators. Every message names the problem, then the fix
// (PRODUCT.md voice; VoiceOver finding F9: never a raw code as the message).

/** Returns the error copy, or null when the value is valid. */
export type Validator = (value: string) => string | null;

export const requiredMessage = (label: string): string =>
  `Enter ${label.toLowerCase()} — this field is required.`;

export const validateDisplayName: Validator = (v) =>
  v.length < 2 ? "Use at least 2 characters so people recognise you." : null;

export const validatePhone: Validator = (v) => {
  const digits = v.replace(/\D/g, "");
  if (!/^\+?[\d\s().-]+$/.test(v) || digits.length < 10 || digits.length > 15) {
    return "Enter a mobile number with its country code, like +1 415 555 0142.";
  }
  return null;
};

export const validateLiveKitUrl: Validator = (v) =>
  /^wss:\/\/[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(v)
    ? null
    : "Use the WebSocket URL, starting with wss:// — for example wss://your-project.livekit.cloud.";

export const validateLiveKitKey: Validator = (v) =>
  /^[A-Za-z0-9_-]{8,}$/.test(v)
    ? null
    : "API keys are at least 8 letters or numbers, with no spaces. Copy it from your LiveKit project’s Keys page.";

export const validateTelnyxKey: Validator = (v) =>
  /^KEY[A-Za-z0-9_]{16,}$/.test(v)
    ? null
    : "Telnyx v2 API keys start with KEY followed by at least 16 letters or numbers. Paste the full key.";

export const validateSipName: Validator = (v) =>
  /^[a-z0-9-]{3,48}$/i.test(v)
    ? null
    : "Use 3–48 letters, numbers or hyphens, matching the name in Telnyx.";

export const validateAreaCode: Validator = (v) =>
  /^[2-9]\d{2}$/.test(v)
    ? null
    : "Enter a 3-digit area code that doesn’t start with 0 or 1, like 415.";

export const validateCalDavServer: Validator = (v) =>
  /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(v)
    ? null
    : "Use the full https:// address of your CalDAV server.";

export const validateS3Endpoint: Validator = (v) => {
  if (!/^https:\/\//i.test(v))
    return "The endpoint must start with https:// — LiveKit Egress only writes over TLS.";
  if (/[<>]/.test(v)) return "Replace the placeholder in angle brackets with your own value.";
  return /^https:\/\/[a-z0-9.-]+(:\d+)?(\/\S*)?$/i.test(v)
    ? null
    : "That doesn’t look like a valid URL. Check for spaces or typos.";
};

export const validateBucket: Validator = (v) =>
  /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(v)
    ? null
    : "Bucket names are 3–63 lowercase letters, numbers, dots or hyphens, and start and end with a letter or number.";

export const validatePrefix: Validator = (v) =>
  v.startsWith("/") ? "Remove the leading slash — prefixes are relative to the bucket." : null;

export const validateHttpsUrl: Validator = (v) =>
  /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(v) ? null : "Use a full https:// URL.";

export const validateKuboRpc: Validator = (v) =>
  /^https?:\/\/[a-z0-9.-]+(:\d+)?(\/\S*)?$/i.test(v)
    ? null
    : "Use the full RPC URL starting with http:// or https://, e.g. http://127.0.0.1:5001.";

export interface FieldRule {
  readonly label: string;
  readonly required?: boolean;
  readonly requiredMessage?: string;
  readonly validate?: Validator;
}

/** settings.html `field().check()`: required first, then the format rule. */
export function checkField(rule: FieldRule, raw: string): string | null {
  const value = raw.trim();
  if (rule.required === true && value === "")
    return rule.requiredMessage ?? requiredMessage(rule.label);
  if (value !== "" && rule.validate !== undefined) return rule.validate(value);
  return null;
}
