// TJ-ARCH-MOB-001 compliant
// Registration draft and its validation rules (agents.html `V` and `stepErrors`).
// Messages give the problem and the fix (PRODUCT.md voice; VoiceOver finding F9).
import type {
  AutoJoin,
  DispatchScope,
  KnowledgeAccess,
  MediaMode,
  ProjectKind,
} from "./agent-config";

export interface RegistrationDraft {
  readonly name: string;
  readonly desc: string;
  readonly role: string;
  readonly glyph: string;
  readonly project: ProjectKind;
  readonly url: string;
  readonly agentName: string;
  readonly media: MediaMode;
  readonly knowledge: KnowledgeAccess;
  readonly dispatch: Exclude<DispatchScope, "system">;
  readonly autoJoin: Exclude<AutoJoin, "always">;
  readonly tag: string;
}

/** Key and secret live in memory only and are never shown again. */
export interface RegistrationSecrets {
  readonly apiKey: string;
  readonly apiSecret: string;
}

export const EMPTY_DRAFT: RegistrationDraft = {
  name: "",
  desc: "",
  role: "",
  glyph: "",
  project: "managed",
  url: "",
  agentName: "",
  media: "speak",
  knowledge: "shared",
  dispatch: "me",
  autoJoin: "never",
  tag: "",
};

export const EMPTY_SECRETS: RegistrationSecrets = { apiKey: "", apiSecret: "" };

export const STEPS = [
  "Identity",
  "Worker & dispatch",
  "Permissions & knowledge",
  "Test & finish",
] as const;

/** The agent_name the sample test treats as not running (prototype FAIL_WORKER). */
export const FAIL_WORKER = "missing-worker";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GLYPH_RE = /^[A-Za-z0-9]{2}$/;
const URL_RE = /^wss:\/\/[A-Za-z0-9.-]+(:\d+)?(\/.*)?$/;
const TAG_RE = /^[a-z0-9-]{2,32}$/;

export type DraftField =
  | "name"
  | "desc"
  | "role"
  | "glyph"
  | "url"
  | "apiKey"
  | "apiSecret"
  | "agentName"
  | "tag";

export const FIELD_LABEL: Readonly<Record<DraftField, string>> = {
  name: "Name",
  desc: "Description",
  role: "Role",
  glyph: "Glyph letters",
  url: "Project URL",
  apiKey: "API key",
  apiSecret: "API secret",
  agentName: "agent_name",
  tag: "Meeting tag",
};

/** One rule per field; '' means valid. `takenWorkers` holds agent_names already registered. */
export function validateField(
  field: DraftField,
  raw: string,
  takenWorkers: readonly string[] = [],
): string {
  const v = raw.trim();
  switch (field) {
    case "name":
      if (v === "") return "Give the agent a name people will see in the meeting.";
      return v.length > 40 ? "Keep the name to 40 characters or fewer." : "";
    case "desc":
      return v.length > 200 ? "Keep the description to 200 characters or fewer." : "";
    case "role":
      return v.length > 40 ? "Keep the role to 40 characters or fewer." : "";
    case "glyph":
      if (v === "") return "Enter two letters or digits for the agent tile, e.g. “SC”.";
      return GLYPH_RE.test(v) ? "" : "Use exactly 2 letters or digits — no spaces or symbols.";
    case "url":
      if (v === "") return "Enter your LiveKit project URL.";
      return URL_RE.test(v)
        ? ""
        : "The URL must start with wss:// followed by your project host — copy it from your LiveKit project settings.";
    case "apiKey":
      return v === ""
        ? "Paste the API key from your LiveKit project. Keys aren’t kept in this browser, so re-enter it if you reloaded."
        : "";
    case "apiSecret":
      return v === ""
        ? "Paste the API secret from your LiveKit project. Secrets aren’t kept in this browser, so re-enter it if you reloaded."
        : "";
    case "agentName":
      if (v === "") return "Enter the agent_name your worker registers with.";
      if (v.length < 3 || v.length > 48) return "Use 3–48 characters.";
      if (!SLUG_RE.test(v))
        return "Use lowercase letters, numbers and single hyphens only, e.g. “scribe-notes”.";
      return takenWorkers.includes(v)
        ? `One of your agents already uses “${v}”. Each registration needs its own agent_name.`
        : "";
    case "tag":
      if (v === "")
        return "Enter the meeting tag that should bring this agent in, e.g. “workshop”.";
      return TAG_RE.test(v) ? "" : "Use 2–32 lowercase letters, numbers or hyphens.";
  }
}

export interface StepError {
  readonly step: 1 | 2 | 3;
  readonly field: DraftField;
  readonly message: string;
}

/** Every unresolved field across steps 1–3, in step order (shown as blockers on step 4). */
export function draftErrors(
  draft: RegistrationDraft,
  secrets: RegistrationSecrets,
  takenWorkers: readonly string[],
): readonly StepError[] {
  const checks: readonly (readonly [1 | 2 | 3, DraftField, string])[] = [
    [1, "name", draft.name],
    [1, "glyph", draft.glyph],
    [1, "desc", draft.desc],
    [1, "role", draft.role],
    ...(draft.project === "own"
      ? ([
          [2, "url", draft.url],
          [2, "apiKey", secrets.apiKey],
          [2, "apiSecret", secrets.apiSecret],
        ] as const)
      : []),
    [2, "agentName", draft.agentName],
    ...(draft.autoJoin === "tagged" ? ([[3, "tag", draft.tag]] as const) : []),
  ];
  return checks.flatMap(([step, field, value]) => {
    const message = validateField(field, value, takenWorkers);
    return message === "" ? [] : [{ step, field, message }];
  });
}

/** km.js `initials`-based glyph suggestion when the name is set and the glyph is empty. */
export function suggestGlyph(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w !== "");
  const first = words[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1] ?? "") : "";
  let glyph = (first.charAt(0) + last.charAt(0)).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (glyph.length === 1)
    glyph = name
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase();
  return GLYPH_RE.test(glyph) ? glyph : "";
}
