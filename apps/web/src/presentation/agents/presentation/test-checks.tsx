// TJ-ARCH-MOB-001 compliant
// Connection-test check list (agents.html `.checks` / `.check`): each check names
// its state in words ("Waiting", "Checking…", "Passed", "Failed", "Skipped") and
// in its icon (number, spinner, check, cross), never by colour alone. The spinner
// stops under reduced motion.
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";

export type CheckState = "waiting" | "running" | "passed" | "failed" | "skipped";

export interface CheckSpec {
  readonly title: string;
  readonly detail: string;
}

const STATUS_TEXT: Readonly<Record<CheckState, string>> = {
  waiting: "Waiting",
  running: "Checking…",
  passed: "Passed",
  failed: "Failed",
  skipped: "Skipped",
};

const ICON_FILL: Readonly<Record<CheckState, string>> = {
  waiting: "bg-muted text-muted-foreground",
  skipped: "bg-muted text-muted-foreground",
  running: "bg-amber-soft text-amber-text",
  passed: "bg-green-soft text-green-text",
  failed: "bg-red-soft text-red-text",
};

const STATUS_FILL: Readonly<Record<CheckState, string>> = {
  waiting: "text-muted-foreground",
  skipped: "text-muted-foreground",
  running: "text-amber-text",
  passed: "text-green-text",
  failed: "text-red-text",
};

function CheckIcon({ state, n }: { readonly state: CheckState; readonly n: number }) {
  if (state === "running") {
    return (
      <KmIcon
        name="refresh"
        className="size-4 animate-spin stroke-[2.25] motion-reduce:animate-none"
      />
    );
  }
  if (state === "passed") return <KmIcon name="check" className="size-4 stroke-[2.25]" />;
  if (state === "failed") return <KmIcon name="x" className="size-4 stroke-[2.25]" />;
  return <>{n}</>;
}

export function TestChecks({
  checks,
  states,
}: {
  readonly checks: readonly CheckSpec[];
  readonly states: readonly CheckState[];
}) {
  return (
    <ol aria-label="Test checks" className="m-0 grid list-none gap-s2 p-0">
      {checks.map((check, index) => {
        const state = states[index] ?? "waiting";
        return (
          <li
            key={check.title}
            data-state={state}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s3 rounded-base bg-card px-s4 py-s3 max-bp768:grid-cols-[auto_minmax(0,1fr)]"
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-8 place-items-center rounded-round font-mono text-xs font-semibold",
                ICON_FILL[state],
              )}
            >
              <CheckIcon state={state} n={index + 1} />
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="block text-sm font-semibold">{check.title}</span>
              <span className="block text-sm text-muted-foreground [overflow-wrap:anywhere]">
                {check.detail}
              </span>
            </span>
            <span
              className={cn(
                "text-sm font-semibold whitespace-nowrap max-bp768:col-start-2",
                STATUS_FILL[state],
              )}
            >
              {STATUS_TEXT[state]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
