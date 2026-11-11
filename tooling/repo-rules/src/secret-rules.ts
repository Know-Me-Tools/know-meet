/**
 * Secret scans. The first and last rules are the exact regexes from
 * .kbd-orchestrator/constraints.md (POSIX classes instead of \s for git grep -E
 * portability). The broadened LiveKit rule covers every assignment syntax:
 * env/shell (=), YAML (:), JSON ("KEY": "v"), Go/TOML (:=, =), Ruby/PHP (=>),
 * any case, and snake/kebab/camel names (LIVEKIT_API_SECRET, livekitApiKey).
 */
export interface SecretRule {
  readonly id: string;
  readonly pattern: string;
  readonly ignoreCase: boolean;
  readonly pathspec: readonly string[];
}

const SPACE = "[[:space:]]*";
const QUOTE = "[\"']?";

export const SECRET_RULES: readonly SecretRule[] = [
  {
    id: "no-livekit-secrets-in-repo",
    pattern: `LIVEKIT_API_(SECRET|KEY)${SPACE}[:=]${SPACE}${QUOTE}[A-Za-z0-9]{16,}`,
    ignoreCase: false,
    pathspec: [".", ":!*.md"],
  },
  {
    id: "no-livekit-secrets-any-syntax",
    pattern: `livekit[_-]?api[_-]?(secret|key)${QUOTE}${SPACE}(:=|=>|[:=])${SPACE}${QUOTE}[A-Za-z0-9+/_-]{16,}`,
    ignoreCase: true,
    pathspec: [".", ":!*.md"],
  },
  {
    id: "no-hardcoded-secrets",
    pattern: `(sk-[A-Za-z0-9]{20,}|api_key${SPACE}=${SPACE}["'][A-Za-z0-9]{12,})`,
    ignoreCase: false,
    pathspec: ["apps", "packages", "docs/design/live"],
  },
];
