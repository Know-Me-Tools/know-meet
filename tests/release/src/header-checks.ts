/**
 * The WR-3 header assertions as one pure function, so the positive scenario
 * (hosted) and the negative control (bare static image) run the same checks.
 * Each problem string starts with the header it concerns.
 */

export type HeaderMap = Readonly<Record<string, string>>;

export interface HeaderExpectations {
  /** The generated Content-Security-Policy value (build:hosted artifact). */
  readonly csp: string;
  /** The site origin, e.g. https://meet.know-me.tools. */
  readonly origin: string;
}

export const HSTS = "strict-transport-security";

function hstsProblem(value: string | undefined): string | null {
  if (value === undefined) return `${HSTS}: missing`;
  const match = /max-age=(\d+)/i.exec(value);
  if (match === null || Number(match[1]) <= 0) return `${HSTS}: no positive max-age in "${value}"`;
  return null;
}

/** Splits a CSP on ";" and normalises whitespace, so formatting cannot fail an equal policy. */
function normaliseCsp(value: string): string {
  return value
    .split(";")
    .map((directive) => directive.trim().replace(/\s+/g, " "))
    .filter((directive) => directive !== "")
    .join("; ");
}

function frameProblem(headers: HeaderMap): string | null {
  const xfo = (headers["x-frame-options"] ?? "").trim().toUpperCase();
  const csp = headers["content-security-policy"] ?? "";
  const ancestorsNone = /(^|;)\s*frame-ancestors\s+'none'\s*(;|$)/i.test(csp);
  return xfo === "DENY" || ancestorsNone
    ? null
    : "x-frame-options/frame-ancestors: framing is not denied";
}

/**
 * Parses one Permissions-Policy feature, e.g. `camera=(self)`, into its
 * allowlist entries, or null when the feature is absent.
 */
export function permissionAllowlist(policy: string, feature: string): string[] | null {
  const pattern = new RegExp(`(?:^|,)\\s*${feature}=(\\*|\\(([^)]*)\\))`, "i");
  const match = pattern.exec(policy);
  if (match === null) return null;
  if (match[1] === "*") return ["*"];
  return (match[2] ?? "")
    .trim()
    .split(/\s+/)
    .filter((entry) => entry !== "");
}

function permissionProblems(policy: string | undefined, origin: string): string[] {
  if (policy === undefined) return ["permissions-policy: missing"];
  const problems: string[] = [];
  for (const feature of ["camera", "microphone"]) {
    const list = permissionAllowlist(policy, feature);
    const allowed = new Set(["self", `"${origin}"`]);
    if (list === null || list.length === 0) {
      problems.push(`permissions-policy: ${feature} is not allowed for this origin`);
    } else if (!list.every((entry) => allowed.has(entry))) {
      const entries = list.join(" ");
      problems.push(`permissions-policy: ${feature} allows more than this origin (${entries})`);
    }
  }
  return problems;
}

/** Every WR-3 header problem of one response; empty when all assertions hold. */
export function headerProblems(headers: HeaderMap, expected: HeaderExpectations): string[] {
  const problems: string[] = [];
  const hsts = hstsProblem(headers[HSTS]);
  if (hsts !== null) problems.push(hsts);

  const csp = headers["content-security-policy"];
  if (csp === undefined) problems.push("content-security-policy: missing");
  else if (normaliseCsp(csp) !== normaliseCsp(expected.csp)) {
    problems.push("content-security-policy: differs from the generated policy");
  }

  if ((headers["x-content-type-options"] ?? "").trim().toLowerCase() !== "nosniff") {
    problems.push("x-content-type-options: not nosniff");
  }
  const frame = frameProblem(headers);
  if (frame !== null) problems.push(frame);
  if ((headers["referrer-policy"] ?? "").trim() === "") problems.push("referrer-policy: missing");
  problems.push(...permissionProblems(headers["permissions-policy"], expected.origin));
  return problems;
}
