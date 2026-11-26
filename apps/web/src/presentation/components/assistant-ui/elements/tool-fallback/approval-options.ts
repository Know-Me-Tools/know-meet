import type {
  ToolApprovalAnswer,
  ToolApprovalOption,
  ToolApprovalQuestion,
  ToolCallMessagePart,
  ToolCallMessagePartStatus,
} from "@assistant-ui/react";

const APPROVAL_OPTION_DEFAULT_LABELS: Record<string, string> = {
  "allow-once": "Allow",
  "allow-always": "Always allow",
  "reject-once": "Deny",
  "reject-always": "Always deny",
};

export const isKnownKind = (kind: string) => Object.hasOwn(APPROVAL_OPTION_DEFAULT_LABELS, kind);

export const isAllowKind = (kind: string) => kind === "allow-once" || kind === "allow-always";

export const approvalOptionLabel = (option: ToolApprovalOption) =>
  option.label ??
  (isKnownKind(option.kind) ? APPROVAL_OPTION_DEFAULT_LABELS[option.kind] : undefined) ??
  option.id;

/**
 * A request that declares how it wants to be presented is asking a question,
 * not gating an action, so a refusal is not one of the answers it accepts
 * unless the request declares itself dismissible.
 */
export const isQuestion = (approval: ToolCallMessagePart["approval"]) =>
  approval?.display === "select" ||
  approval?.display === "text" ||
  approval?.display === "questions";

export const questionAcceptsText = (question: ToolApprovalQuestion) =>
  !question.options?.length || question.allowFreeform === true;

export const answerLabels = (
  question: ToolApprovalQuestion,
  answer: ToolApprovalAnswer | undefined,
) => [
  ...(answer?.optionIds ?? []).map(
    (id) => question.options?.find((option) => option.id === id)?.label ?? id,
  ),
  ...(answer?.text?.trim() ? [answer.text] : []),
];

export const isSettled = (approval: ToolCallMessagePart["approval"]) =>
  approval != null && (approval.approved !== undefined || approval.resolution !== undefined);

export const offersInterruptAction = (
  status: ToolCallMessagePartStatus | undefined,
  approval: ToolCallMessagePart["approval"],
  interrupt: ToolCallMessagePart["interrupt"],
) =>
  status?.type !== "requires-action" ||
  status.reason !== "interrupt" ||
  approval != null ||
  interrupt != null;

export const approvalPressableClass = "active:scale-[0.98]";
