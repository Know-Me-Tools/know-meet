import { type Classify, type FindingClass, ScanError } from "./model.ts";

/** Names excluded from the value comparison because the value is public. */
const EXCLUDED_NAMES: readonly string[] = ["LIVEKIT_URL"];
const MIN_VALUE_LENGTH = 8;

/**
 * Class 2: a run of 32 or more alphanumerics right after a secret-like key and an
 * assignment, on one line or on the next indented line of a YAML pair. The optional
 * `\\{0,2}["']` groups cover quoted JSON and JSON escaped inside a JSON string (an image
 * history entry).
 */
const SHAPE =
  /(?:livekit_api_secret|api_?secret)(?:\\{0,2}["'])?[ \t]*(?:=>|=|:)(?:[ \t]*|[ \t]*\r?\n[ \t]+)(?:\\{0,2}["'])?[A-Za-z0-9]{32,}/i;

/** Class 3 candidate: three base64url segments, the first two starting like a JSON object. */
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}/g;

export interface SecretValues {
  readonly values: readonly Buffer[];
  readonly shortSkipped: number;
  readonly excluded: readonly string[];
}

/**
 * Reads the values of the LIVEKIT_ variables of this process. Throws (exit 2) when no
 * value can be compared: the strongest check would silently not run.
 */
export function loadSecretValues(env: NodeJS.ProcessEnv): SecretValues {
  const values: Buffer[] = [];
  let shortSkipped = 0;
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith("LIVEKIT_") || EXCLUDED_NAMES.includes(name)) continue;
    if (value === undefined || value === "") continue;
    if (value.length < MIN_VALUE_LENGTH) {
      shortSkipped += 1;
      continue;
    }
    values.push(Buffer.from(value, "utf8"));
  }
  if (values.length === 0) {
    throw new ScanError(
      "ERROR missing-livekit-values: no LIVEKIT_ variable other than LIVEKIT_URL holds 8 or more characters",
    );
  }
  return { values, shortSkipped, excluded: EXCLUDED_NAMES };
}

function isJsonObject(segment: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
}

function hasJwt(text: string): boolean {
  for (const match of text.matchAll(JWT)) {
    const [header, payload] = match[0].split(".");
    if (header === undefined || payload === undefined) continue;
    if (isJsonObject(header) && isJsonObject(payload)) return true;
  }
  return false;
}

/** Builds the classifier for classes 1 to 3. Class 4 reads parsed manifests, not bytes. */
export function makeClassifier(secrets: SecretValues): Classify {
  return (data: Buffer): readonly FindingClass[] => {
    const found: FindingClass[] = [];
    if (secrets.values.some((value) => data.includes(value))) found.push("livekit-env-value");
    // latin1 maps every byte to one character, so offsets and binary input are safe.
    const text = data.toString("latin1");
    if (SHAPE.test(text)) found.push("livekit-api-secret-shape");
    if (hasJwt(text)) found.push("jwt");
    return found;
  };
}

/** Replaces any location text that contains a secret value, so a path named after one cannot leak it. */
export function makeRedactor(secrets: SecretValues): (text: string) => string {
  const needles = secrets.values.map((value) => value.toString("latin1"));
  return (text: string): string => {
    const bytes = Buffer.from(text, "utf8").toString("latin1");
    return needles.some((needle) => bytes.includes(needle)) ? "<location-withheld>" : text;
  };
}
