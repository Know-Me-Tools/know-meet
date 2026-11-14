// TJ-ARCH-MOB-001 compliant
// settings.html `.checks` / `.check[data-s]`: a numbered row per step with a
// round state glyph, the step label and detail, and the state word. The word
// always states the result (Passed, Failed, Skipped), so colour is never alone.
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import type { CheckRowState, CheckStep } from "../domain/settings";

const GLYPH_FILL: Readonly<Record<CheckRowState["state"], string>> = {
  wait: "bg-muted text-muted-foreground",
  skip: "bg-muted text-muted-foreground",
  run: "bg-amber-soft text-amber-text",
  ok: "bg-green-soft text-green-text",
  fail: "bg-red-soft text-red-text",
};

function Glyph({ row, index }: { readonly row: CheckRowState; readonly index: number }) {
  switch (row.state) {
    case "run":
      return (
        <KmIcon
          name="refresh"
          className="animate-spin [animation-duration:var(--anim-spin)] motion-reduce:animate-none"
        />
      );
    case "ok":
      return <KmIcon name="check" />;
    case "fail":
      return <KmIcon name="alert" />;
    case "skip":
      return <KmIcon name="remove" />;
    default:
      return <span className="font-mono text-13">{index + 1}</span>;
  }
}

export function ChecksList({
  steps,
  rows,
  label,
}: {
  readonly steps: readonly CheckStep[];
  readonly rows: readonly CheckRowState[];
  readonly label?: string;
}) {
  return (
    <ol aria-label={label} className="m-0 grid list-none gap-s2 p-0">
      {steps.map((step, index) => {
        const row = rows[index] ?? { state: "wait", text: "Waiting", detail: step.detail };
        return (
          <li
            key={step.label}
            data-s={row.state}
            className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-s3 rounded-base bg-bg-2 px-s4 py-s3 max-bp768:grid-cols-[36px_minmax(0,1fr)]"
          >
            <span
              aria-hidden="true"
              className={cn("grid size-9 place-items-center rounded-round", GLYPH_FILL[row.state])}
            >
              <Glyph row={row} index={index} />
            </span>
            <span className="grid min-w-0 gap-0.5">
              <b>{step.label}</b>
              <small
                className={cn(
                  "text-sm [overflow-wrap:anywhere]",
                  row.state === "fail" ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {row.detail}
              </small>
            </span>
            <span
              className={cn(
                "text-sm font-semibold whitespace-nowrap max-bp768:col-start-2",
                row.state === "ok"
                  ? "text-green-text"
                  : row.state === "fail"
                    ? "text-red-text"
                    : "text-muted-foreground",
              )}
            >
              {row.text}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
