"use client";

import type { ToolApprovalOption } from "@assistant-ui/react";
import { Button } from "@know-meet/ui/components/button";
import { cn } from "@know-meet/ui/lib/utils";
import type { ComponentPropsWithoutRef, RefCallback } from "react";
import { approvalOptionLabel, approvalPressableClass } from "./approval-options";

export function ToolFallbackApprovalConfirmation({
  confirming,
  className,
  containerProps,
  containerRef,
  locked,
  onConfirm,
  onBack,
}: {
  confirming: ToolApprovalOption;
  className: string | undefined;
  containerProps: ComponentPropsWithoutRef<"div">;
  containerRef: RefCallback<HTMLDivElement>;
  locked: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const confirmMeta = typeof confirming.confirm === "object" ? confirming.confirm : undefined;
  const confirmDescription = confirmMeta?.description ?? confirming.description;
  return (
    <div
      data-slot="tool-fallback-approval-confirm"
      tabIndex={-1}
      className={cn("aui-tool-fallback-approval-confirm flex flex-col gap-2 pt-1", className)}
      {...containerProps}
      ref={containerRef}
    >
      <p className="aui-tool-fallback-approval-confirm-title font-semibold">
        {confirmMeta?.title ?? `${approvalOptionLabel(confirming)}?`}
      </p>
      {confirmDescription && (
        <p className="aui-tool-fallback-approval-confirm-description text-muted-foreground whitespace-pre-line">
          {confirmDescription}
        </p>
      )}
      {confirming.grants && confirming.grants.length > 0 && (
        <ul className="aui-tool-fallback-approval-confirm-grants flex flex-col gap-1">
          {confirming.grants.map((grant) => (
            <li key={grant}>
              <code className="aui-tool-fallback-approval-confirm-grant bg-muted rounded px-1.5 py-0.5 text-xs">
                {grant}
              </code>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" className={approvalPressableClass} onClick={onConfirm} disabled={locked}>
          Confirm
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={approvalPressableClass}
          onClick={onBack}
          disabled={locked}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
