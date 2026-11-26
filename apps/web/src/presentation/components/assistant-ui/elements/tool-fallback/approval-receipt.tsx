"use client";

import type { ToolCallMessagePart } from "@assistant-ui/react";
import { cn } from "@know-meet/ui/lib/utils";
import { CheckIcon, CircleMinusIcon, XCircleIcon } from "lucide-react";
import { answerLabels, approvalOptionLabel, isKnownKind, isQuestion } from "./approval-options";

type ApprovalReceipt = {
  outcome: "allowed" | "refused" | "closed";
  label: string;
  option?: string | undefined;
};

/**
 * A settled request reads as a past-tense record of what happened to it, so
 * scrolling back never shows a live control for a decision already made.
 */
const approvalReceipt = (
  approval: NonNullable<ToolCallMessagePart["approval"]>,
): ApprovalReceipt => {
  if (approval.resolution !== undefined)
    return {
      outcome: "closed",
      label:
        approval.resolution === "cancelled"
          ? "Cancelled before a decision"
          : "Expired before a decision",
    };

  const chosen =
    approval.optionId === undefined
      ? undefined
      : approval.options?.find((option) => option.id === approval.optionId);
  const option =
    chosen !== undefined
      ? approvalOptionLabel(chosen)
      : approval.optionId === undefined
        ? undefined
        : approval.optionId;
  const answered = isQuestion(approval) || (chosen !== undefined && !isKnownKind(chosen.kind));
  const automatic = approval.isAutomatic ? " automatically" : "";

  if (approval.approved)
    return {
      outcome: "allowed",
      label: `${answered ? "Answered" : "Allowed"}${automatic}`,
      option,
    };
  return {
    outcome: "refused",
    label: `${answered ? "Dismissed" : "Denied"}${automatic}`,
    option,
  };
};

const receiptIcons = {
  allowed: CheckIcon,
  refused: XCircleIcon,
  closed: CircleMinusIcon,
} satisfies Record<ApprovalReceipt["outcome"], React.ElementType>;

export function ToolFallbackApprovalReceipt({
  approval,
  className,
  receiptRef,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  approval: NonNullable<ToolCallMessagePart["approval"]>;
  receiptRef: React.RefCallback<HTMLDivElement>;
}) {
  const receipt = approvalReceipt(approval);
  const Icon = receiptIcons[receipt.outcome];
  const notes = [
    ...new Set(
      [approval.text, approval.reason].filter(
        (value): value is string => typeof value === "string" && value !== "",
      ),
    ),
  ];

  return (
    <div
      ref={receiptRef}
      data-slot="tool-fallback-approval-receipt"
      data-outcome={receipt.outcome}
      tabIndex={-1}
      className={cn("aui-tool-fallback-approval-receipt flex flex-col gap-1.5 pt-1", className)}
      {...props}
    >
      {approval.prompt ? (
        <p className="aui-tool-fallback-approval-prompt text-muted-foreground whitespace-pre-line">
          {approval.prompt}
        </p>
      ) : null}
      <p className="aui-tool-fallback-approval-receipt-label flex items-center gap-1.5">
        <Icon aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
        <span className="font-medium">{receipt.label}</span>
        {receipt.option !== undefined ? (
          <span className="text-muted-foreground">· {receipt.option}</span>
        ) : null}
      </p>
      {approval.answers &&
        approval.questions?.map((question) => {
          const labels = answerLabels(
            question,
            approval.answers && Object.hasOwn(approval.answers, question.id)
              ? approval.answers[question.id]
              : undefined,
          );
          if (labels.length === 0) return null;
          return (
            <p
              key={question.id}
              className="aui-tool-fallback-approval-receipt-answer whitespace-pre-line"
            >
              <span className="text-muted-foreground">{question.header ?? question.prompt}</span> ·{" "}
              {labels.join(", ")}
            </p>
          );
        })}
      {notes.map((text) => (
        <p
          key={text}
          className="aui-tool-fallback-approval-receipt-note text-muted-foreground whitespace-pre-line"
        >
          {text}
        </p>
      ))}
    </div>
  );
}
