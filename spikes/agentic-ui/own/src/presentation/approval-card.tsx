/**
 * Human-in-the-loop approval card. Native buttons (Enter/Space), never
 * `disabled` after a decision: aria-disabled keeps focus on the pressed
 * button instead of dropping it to <body>. No focus is moved by the app.
 * Explicit tabIndex: macOS WebKit leaves plain buttons out of the Tab order
 * unless "Press Tab to highlight each item" is on; an explicit tabindex opts in.
 */
import type { InterruptStatus } from "../domain/transcript-model.ts";
import { useInterrupt, useServices } from "./session-context.tsx";
import { Badge, type BadgeTone } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.tsx";

type ShownStatus = Exclude<InterruptStatus, "failed">;

const LABEL: Readonly<Record<ShownStatus, { readonly text: string; readonly tone: BadgeTone }>> = {
  pending: { text: "Waiting for you", tone: "warning" },
  approved: { text: "Approved", tone: "success" },
  rejected: { text: "Rejected", tone: "danger" },
  expired: { text: "Expired", tone: "neutral" },
  cancelled: { text: "Withdrawn", tone: "neutral" },
};

export function ApprovalCard({ interruptId }: { readonly interruptId: string }) {
  const interrupt = useInterrupt(interruptId);
  const { session } = useServices();
  if (interrupt === undefined) return null;
  const status: ShownStatus = interrupt.status === "failed" ? "pending" : interrupt.status;
  const decidable = status === "pending";
  const label = LABEL[status];
  const decide = (decision: "approve" | "reject"): void => {
    if (decidable) void session.decide(interruptId, decision);
  };
  return (
    <Card data-testid="km-approval" data-interrupt-id={interruptId} data-status={status} role="group" aria-label="Approval request" className="bg-surface">
      <CardHeader>
        <CardTitle>Approval needed</CardTitle>
        <Badge tone={label.tone}>{label.text}</Badge>
      </CardHeader>
      <CardContent>{interrupt.message ?? interrupt.reason}</CardContent>
      {interrupt.status === "failed" ? <p className="text-13 text-red-text">Sending your decision failed. Try again.</p> : null}
      <div className="flex gap-2">
        <Button data-testid="km-approval-approve" size="sm" tabIndex={0} aria-disabled={decidable ? undefined : true} onClick={() => decide("approve")}>
          Approve
        </Button>
        <Button data-testid="km-approval-reject" size="sm" tabIndex={0} variant="secondary" aria-disabled={decidable ? undefined : true} onClick={() => decide("reject")}>
          Reject
        </Button>
      </div>
    </Card>
  );
}
