/**
 * Human-in-the-loop approval card (shadcn AI Elements "Confirmation" pattern, hand-built on the
 * Know Meet tokens). Status comes from the durable store, so pending → approved/rejected/expired is
 * what entity-graph holds, not what the runtime last rendered. Buttons are native, reachable by Tab
 * (explicit tabIndex for WebKit) and use aria-disabled after a decision so focus is never dropped.
 */
import { useCallback } from "react";
import { restoreFocusIfLost, useServices, useSessionRead } from "../session-context.tsx";

export interface ApprovalCardProps {
  readonly interruptId: string;
  readonly title: string;
  readonly detail?: string;
  readonly onDecide: (approved: boolean) => void;
}

const STATUS_COPY: Readonly<Record<string, string>> = {
  pending: "Waiting for your decision",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired: this request can no longer be approved",
  cancelled: "Cancelled",
};

export function ApprovalCard({ interruptId, title, detail, onDecide }: ApprovalCardProps) {
  const services = useServices();
  const status = useSessionRead(useCallback((r) => r.interrupt(interruptId)?.status ?? "pending", [interruptId]));
  services.renders.component("ApprovalCard");
  const open = status === "pending";
  const decide = (approved: boolean) => {
    if (!open) return;
    onDecide(approved);
    restoreFocusIfLost(services);
  };
  const tone = status === "approved" ? "text-green-text" : status === "pending" ? "text-amber-text" : "text-fg-sub";
  return (
    <div data-testid="km-approval" data-interrupt-id={interruptId} data-status={status} className="mt-s3 rounded-base bg-surface p-s4">
      <p className="font-display text-15 font-semibold text-fg">{title}</p>
      {detail === undefined ? null : <p className="mt-s1 text-13 text-fg-sub">{detail}</p>}
      <p className={`mt-s2 text-xs font-medium tracking-label uppercase ${tone}`}>{STATUS_COPY[status] ?? status}</p>
      <div className="mt-s3 flex gap-s2">
        <button
          type="button"
          tabIndex={0}
          data-testid="km-approval-approve"
          aria-disabled={open ? undefined : true}
          onClick={() => decide(true)}
          className="rounded-8 bg-ember-btn px-s4 py-s2 text-sm font-semibold text-on-ember hover:bg-ember-btn-hov focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
        >
          Approve and send
        </button>
        <button
          type="button"
          tabIndex={0}
          data-testid="km-approval-reject"
          aria-disabled={open ? undefined : true}
          onClick={() => decide(false)}
          className="rounded-8 bg-card px-s4 py-s2 text-sm font-semibold text-fg hover:bg-card-hov focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
