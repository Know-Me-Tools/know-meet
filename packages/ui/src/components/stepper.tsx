// TJ-ARCH-MOB-001 compliant
// km.css `.steps` wizard stepper: an ordered list of 40px pills (surface fill,
// fg-sub 14px semibold) each led by a 28px mono step number. The current step is
// `aria-current="step"` (ember-soft pill, ember-btn number); a done step is fg text
// with a green-soft number holding a check. State is never colour alone: the
// number becomes a check, and each item carries sr-only "Step n, completed:" /
// ", current:" text. Not interactive (agents.html registration).
import type * as React from "react";
import { cn } from "#lib/utils";

function Stepper({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="stepper"
      className={cn("m-0 flex list-none flex-wrap gap-s2 p-0", className)}
      {...props}
    />
  );
}

type StepState = "done" | "current" | "upcoming";

interface StepperItemProps extends Omit<React.ComponentProps<"li">, "children"> {
  readonly n: number;
  readonly state: StepState;
  readonly children: React.ReactNode;
}

const STATE_TEXT: Readonly<Record<StepState, string>> = {
  done: ", completed: ",
  current: ", current: ",
  upcoming: ": ",
};

function StepperItem({ n, state, className, children, ...props }: StepperItemProps) {
  return (
    <li
      data-slot="stepper-item"
      data-state={state}
      aria-current={state === "current" ? "step" : undefined}
      className={cn(
        "group/step inline-flex min-h-10 items-center gap-s2 rounded-pill bg-surface py-0 pr-s3 pl-1.5 text-sm font-semibold text-muted-foreground data-[state=current]:bg-ember-soft data-[state=current]:text-ember-text data-[state=done]:text-foreground",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="inline-grid size-7 flex-none place-items-center rounded-round bg-muted font-mono text-xs text-foreground group-data-[state=current]/step:bg-ember-btn group-data-[state=current]/step:text-on-ember group-data-[state=done]/step:bg-green-soft group-data-[state=done]/step:text-green-text"
      >
        {state === "done" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false"
            className="size-[15px]"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          n
        )}
      </span>
      <span>
        <span className="sr-only">{`Step ${n}${STATE_TEXT[state]}`}</span>
        {children}
      </span>
    </li>
  );
}

export { Stepper, StepperItem };
export type { StepState };
