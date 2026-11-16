/**
 * The WR-3 header assertions, mirrored from tests/release/src/header-checks.ts so the
 * boundary tool and the hosted Playwright run apply the same rules. Mirrored, not
 * imported: a tooling script must not depend on the test package. Keep the two in step;
 * the only deliberate difference is the CSP comparison, which is exact here when a
 * --csp-file is given (the test accepts a whitespace-normalised equal policy).
 */

export type HeaderMap = Readonly<Record<string, string>>;

export interface HeaderExpectations {
  /** The site origin, for example https://meet.know-me.tools. */
  readonly origin: string;
  /** The exact CSP header value from --csp-file, or undefined to require only presence. */
  readonly cspExact: string | undefined;
}

const HSTS = "strict-transport-security";

function hstsProblem(value: string | undefined): string | null {
  if (value === undefined) return `${HSTS}: missing`;
  const match = /max-age=(\d+)/i.exec(value);
  if (match === null || Number(match[1]) <= 0) return `${HSTS}: no positive max-age`;
  return null;
}

/** Splits a CSP on ";" and normalises whitespace, to tell a formatting-only difference. */
function normaliseCsp(value: string): string {
  return value
    .split(";")
    .map((directive) => directive.trim().replace(/\s+/g, " "))
    .filter((directive) => directive !== "")
    .join("; ");
}

function cspProblem(value: string | undefined, exact: string | undefined): string | null {
  if (value === undefined || value.trim() === "") return "content-security-policy: missing";
  if (exact === undefined || value === exact) return null;
  const formattingOnly = normaliseCsp(value) === normaliseCsp(exact);
  return formattingOnly
    ? "content-security-policy: not byte-equal to the generated policy (formatting only)"
    : "content-security-policy: differs from the generated policy";
}

function frameProblem(headers: HeaderMap): string | null {
  const xfo = (headers["x-frame-options"] ?? "").trim().toUpperCase();
  const csp = headers["content-security-policy"] ?? "";
  const ancestorsNone = /(^|;)\s*frame-ancestors\s+'none'\s*(;|$)/i.test(csp);
  return xfo === "DENY" || ancestorsNone
    ? null
    : "x-frame-options/frame-ancestors: framing is not denied";
}

/** The allowlist of one Permissions-Policy feature, or null when the feature is absent. */
function permissionAllowlist(policy: string, feature: string): string[] | null {
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
  const allowed = new Set(["self", `"${origin}"`]);
  for (const feature of ["camera", "microphone"]) {
    const list = permissionAllowlist(policy, feature);
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
  const csp = cspProblem(headers["content-security-policy"], expected.cspExact);
  if (csp !== null) problems.push(csp);
  if ((headers["x-content-type-options"] ?? "").trim().toLowerCase() !== "nosniff") {
    problems.push("x-content-type-options: not nosniff");
  }
  const frame = frameProblem(headers);
  if (frame !== null) problems.push(frame);
  if ((headers["referrer-policy"] ?? "").trim() === "") problems.push("referrer-policy: missing");
  problems.push(...permissionProblems(headers["permissions-policy"], expected.origin));
  return problems;
}
