"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { cn } from "@know-meet/ui/lib/utils";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { ToolFallbackApproval } from "./tool-fallback/approval";
import { isSettled, offersInterruptAction } from "./tool-fallback/approval-options";
import {
  ToolFallbackArgs,
  ToolFallbackContent,
  ToolFallbackError,
  ToolFallbackResult,
  ToolFallbackRoot,
  ToolFallbackTrigger,
} from "./tool-fallback/primitives";

const ToolFallbackImpl: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
  isError,
  status,
  responseDeliveryStatus,
  addResult,
  resume,
  interrupt,
  approval,
  respondToApproval,
}) => {
  const isCancelled = status?.type === "incomplete" && status.reason === "cancelled";
  const isRequiresAction = status?.type === "requires-action";
  const shouldRenderApproval =
    approval != null || (isRequiresAction && offersInterruptAction(status, approval, interrupt));

  const [open, setOpen] = useState(isRequiresAction);
  const [prevRequiresAction, setPrevRequiresAction] = useState(isRequiresAction);
  if (isRequiresAction !== prevRequiresAction) {
    setPrevRequiresAction(isRequiresAction);
    if (isRequiresAction) setOpen(true);
  }
  const approvalHadFocusRef = useRef(false);
  const approvalElementRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useLayoutEffect(() => {
    const focusedElement = approvalElementRef.current;
    if (
      !focusedElement ||
      focusedElement.isConnected ||
      status?.type === "requires-action" ||
      !approvalHadFocusRef.current
    ) {
      return;
    }

    const shouldFocusTrigger = approval == null || !isSettled(approval);
    approvalHadFocusRef.current = false;
    const { activeElement, body } = focusedElement.ownerDocument;
    if (shouldFocusTrigger && (activeElement == null || activeElement === body)) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [approval, status?.type]);

  return (
    <ToolFallbackRoot open={open} onOpenChange={setOpen}>
      <ToolFallbackTrigger
        toolName={toolName}
        status={status}
        isError={isError}
        responseDeliveryStatus={responseDeliveryStatus}
      />
      <ToolFallbackContent>
        <ToolFallbackError status={status} />
        <ToolFallbackArgs argsText={argsText} className={cn(isCancelled && "opacity-60")} />
        {shouldRenderApproval && (
          <ToolFallbackApproval
            addResult={addResult}
            resume={resume}
            interrupt={interrupt}
            approval={approval}
            respondToApproval={respondToApproval}
            status={status}
            onFocusCapture={(event) => {
              const root = event.currentTarget.closest('[data-slot="tool-fallback-root"]');
              triggerRef.current =
                root?.querySelector<HTMLButtonElement>('[data-slot="tool-fallback-trigger"]') ??
                null;
              approvalElementRef.current = event.currentTarget;
              approvalHadFocusRef.current = true;
            }}
            onBlurCapture={(event) => {
              const relatedTarget = event.relatedTarget;
              const stillFocused = relatedTarget
                ? event.currentTarget.contains(relatedTarget as Node)
                : event.currentTarget.contains(event.currentTarget.ownerDocument.activeElement);
              if (!stillFocused) approvalHadFocusRef.current = false;
            }}
          />
        )}
        <ToolFallbackResult result={result} />
      </ToolFallbackContent>
    </ToolFallbackRoot>
  );
};

const ToolFallback = memo(ToolFallbackImpl) as unknown as ToolCallMessagePartComponent & {
  Root: typeof ToolFallbackRoot;
  Trigger: typeof ToolFallbackTrigger;
  Content: typeof ToolFallbackContent;
  Args: typeof ToolFallbackArgs;
  Result: typeof ToolFallbackResult;
  Error: typeof ToolFallbackError;
  Approval: typeof ToolFallbackApproval;
};

ToolFallback.displayName = "ToolFallback";
ToolFallback.Root = ToolFallbackRoot;
ToolFallback.Trigger = ToolFallbackTrigger;
ToolFallback.Content = ToolFallbackContent;
ToolFallback.Args = ToolFallbackArgs;
ToolFallback.Result = ToolFallbackResult;
ToolFallback.Error = ToolFallbackError;
ToolFallback.Approval = ToolFallbackApproval;

export type { ToolFallbackRootProps } from "./tool-fallback/primitives";
export { formatUnknownValue } from "./tool-fallback/primitives";

export {
  offersInterruptAction,
  ToolFallback,
  ToolFallbackApproval,
  ToolFallbackArgs,
  ToolFallbackContent,
  ToolFallbackError,
  ToolFallbackResult,
  ToolFallbackRoot,
  ToolFallbackTrigger,
};
