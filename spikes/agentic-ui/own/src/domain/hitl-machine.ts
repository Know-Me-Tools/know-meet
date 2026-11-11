/**
 * Human-in-the-loop interrupt state machine.
 *
 *   pending --approve--> approved   (effect: resume resolved {approved: true})
 *   pending --reject---> rejected   (effect: resume resolved {approved: false})
 *   pending --abandon--> cancelled  (effect: resume cancelled, no payload)
 *   pending --expire---> expired    (no effect; terminal)
 *   approved|rejected|cancelled --resume-failed--> failed (the decision can be retried)
 *   failed behaves like pending.
 *
 * A decision taken at or after `expiresAtMs` becomes an expiry: a resolved
 * resume is never produced for an expired interrupt. Repeating a decision is
 * a no-op (idempotent): only the first accepted transition emits an effect.
 */
import type { Interrupt, InterruptStatus, ToolCallStatus } from "./transcript-model.ts";

export type HitlDecision = "approve" | "reject" | "abandon";
export type HitlCommand = HitlDecision | "expire" | "resume-failed";

/** AG-UI ResumeEntry the decision produces. */
export type ResumeEntry =
  | { readonly interruptId: string; readonly status: "resolved"; readonly payload: { readonly approved: boolean } }
  | { readonly interruptId: string; readonly status: "cancelled" };

export interface HitlTransition {
  readonly status: InterruptStatus;
  readonly accepted: boolean;
  readonly resume: ResumeEntry | null;
}

const OPEN: ReadonlySet<InterruptStatus> = new Set<InterruptStatus>(["pending", "failed"]);
const DECIDED: ReadonlySet<InterruptStatus> = new Set<InterruptStatus>(["approved", "rejected", "cancelled"]);

export function isExpired(interrupt: Interrupt, nowMs: number): boolean {
  return interrupt.expiresAtMs !== undefined && nowMs >= interrupt.expiresAtMs;
}

export function isDecidable(interrupt: Interrupt, nowMs: number): boolean {
  return OPEN.has(interrupt.status) && !isExpired(interrupt, nowMs);
}

function decisionEffect(interrupt: Interrupt, decision: HitlDecision): HitlTransition {
  switch (decision) {
    case "approve":
      return { status: "approved", accepted: true, resume: { interruptId: interrupt.id, status: "resolved", payload: { approved: true } } };
    case "reject":
      return { status: "rejected", accepted: true, resume: { interruptId: interrupt.id, status: "resolved", payload: { approved: false } } };
    case "abandon":
      return { status: "cancelled", accepted: true, resume: { interruptId: interrupt.id, status: "cancelled" } };
  }
}

export function transition(interrupt: Interrupt, command: HitlCommand, nowMs: number): HitlTransition {
  const unchanged: HitlTransition = { status: interrupt.status, accepted: false, resume: null };
  if (command === "resume-failed") {
    return DECIDED.has(interrupt.status) ? { status: "failed", accepted: true, resume: null } : unchanged;
  }
  if (!OPEN.has(interrupt.status)) return unchanged;
  if (command === "expire" || isExpired(interrupt, nowMs)) return { status: "expired", accepted: true, resume: null };
  return decisionEffect(interrupt, command);
}

/** The tool-call status an interrupt's state implies for the call it gates. */
export function toolStatusFor(status: InterruptStatus): ToolCallStatus {
  switch (status) {
    case "pending":
    case "failed":
      return "pending-approval";
    case "approved":
      return "approved";
    case "rejected":
    case "cancelled":
      return "rejected";
    case "expired":
      return "expired";
  }
}
