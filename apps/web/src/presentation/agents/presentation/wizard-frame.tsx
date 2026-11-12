// TJ-ARCH-MOB-001 compliant
// Registration wizard chrome (agents.html `wizardFrame`, `stepper`, `wizFoot`):
// crumbs, "Step n of 4 · <step>" eyebrow, h1, the kit Stepper (ordered list,
// aria-current="step"), the step body, then the footer with Back/Cancel and the
// submit button that targets the step form by id.
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Stepper, StepperItem } from "@know-meet/ui/components/stepper";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { useDocumentTitle } from "../../shared/use-document-title";
import { STEPS } from "../domain/registration";
import { AgentsPageHead, type Crumb } from "./agents-ui";

export type WizardStep = 1 | 2 | 3 | 4;

export const WIZARD_FORM_ID = "wiz-form";

const WIZARD_CRUMBS: readonly Crumb[] = [
  { label: "Agents", to: "registry" },
  { label: "Register an agent" },
];

export function WizardHead({
  step,
  crumbs = WIZARD_CRUMBS,
  title = "Register an agent",
}: {
  readonly step: WizardStep;
  readonly crumbs?: readonly Crumb[];
  readonly title?: string;
}) {
  return (
    <AgentsPageHead
      crumbs={crumbs}
      eyebrow={`Step ${step} of 4 · ${STEPS[step - 1]}`}
      title={title}
    />
  );
}

export function WizardStepper({ current }: { readonly current: WizardStep }) {
  return (
    <Stepper aria-label="Registration progress" className="mb-s6">
      {STEPS.map((label, index) => {
        const n = index + 1;
        const state = n < current ? "done" : n === current ? "current" : "upcoming";
        return (
          <StepperItem key={label} n={n} state={state}>
            {label}
          </StepperItem>
        );
      })}
    </Stepper>
  );
}

/** agents.html `.wiz-foot`: spaced from the body (no rule, D-6); buttons fill the row under 768px. */
export function WizardFoot({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="mt-s6 flex flex-wrap justify-between gap-s3 pt-s5 [&>[data-slot=btn-row]]:ml-auto max-bp768:[&>[data-slot=btn-row]]:ml-0 max-bp768:[&>[data-slot=btn-row]]:w-full max-bp768:[&>[data-slot=btn-row]>*]:flex-auto">
      {children}
    </div>
  );
}

export function WizardFrame({
  step,
  children,
}: {
  readonly step: WizardStep;
  readonly children: React.ReactNode;
}) {
  useDocumentTitle(`Register an agent — ${STEPS[step - 1]} — Know Meet`);
  const back =
    step > 1 ? (
      <Link
        to="/agents"
        hash={`register:${step - 1}`}
        className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}
      >
        <span>Back</span>
      </Link>
    ) : (
      <Link
        to="/agents"
        hash="registry"
        className={cn(buttonVariants({ variant: "ghost" }), focusFillClass)}
      >
        <span>Cancel</span>
      </Link>
    );
  return (
    <>
      <WizardHead step={step} />
      <WizardStepper current={step} />
      {children}
      <WizardFoot>
        {back}
        {step < 4 ? (
          <div data-slot="btn-row" className="flex flex-wrap items-center gap-s2">
            <Button type="submit" form={WIZARD_FORM_ID}>
              <span>Next</span>
              <KmIcon name="chevron-right" className="size-4" />
            </Button>
          </div>
        ) : null}
      </WizardFoot>
    </>
  );
}
