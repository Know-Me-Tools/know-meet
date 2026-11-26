"use client";

import {
  type ToolApprovalOption,
  type ToolCallMessagePart,
  type ToolCallMessagePartProps,
  toolApprovalAcceptsText,
  useAuiState,
} from "@assistant-ui/react";
import { Button } from "@know-meet/ui/components/button";
import { Textarea } from "@know-meet/ui/components/textarea";
import { cn } from "@know-meet/ui/lib/utils";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ToolFallbackApprovalConfirmation } from "./approval-confirmation";
import {
  approvalOptionLabel,
  approvalPressableClass,
  isAllowKind,
  isKnownKind,
  isQuestion,
  isSettled,
  offersInterruptAction,
} from "./approval-options";
import { ToolFallbackApprovalQuestions } from "./approval-questions";
import { ToolFallbackApprovalReceipt } from "./approval-receipt";

const APPROVED_RESULT = "Approved by user";
const DENIED_RESULT = "User denied tool execution";

type ToolFallbackApprovalProps = React.ComponentPropsWithoutRef<"div"> &
  Partial<
    Pick<ToolCallMessagePartProps, "addResult" | "resume" | "respondToApproval" | "status">
  > & {
    interrupt?: ToolCallMessagePart["interrupt"];
    approval?: ToolCallMessagePart["approval"];
  };

export const ToolFallbackApproval = forwardRef<HTMLDivElement, ToolFallbackApprovalProps>(
  function ToolFallbackApproval(props, ref) {
    const carryFocusRef = useRef(false);
    return (
      <ToolFallbackApprovalImpl
        key={props.approval?.id}
        carryFocusRef={carryFocusRef}
        forwardedRef={ref}
        {...props}
      />
    );
  },
);

function ToolFallbackApprovalImpl({
  className,
  forwardedRef,
  carryFocusRef,
  addResult,
  resume,
  interrupt,
  approval,
  respondToApproval,
  status,
  ...props
}: Omit<ToolFallbackApprovalProps, "ref"> & {
  forwardedRef: React.ForwardedRef<HTMLDivElement>;
  carryFocusRef: React.MutableRefObject<boolean>;
}) {
  const [submitted, setSubmitted] = useState(false);
  const voiceActive = useAuiState((s) => s.thread.voice !== undefined);
  const canAnswer = useAuiState((s) => s.thread.capabilities.answerToolCall);
  const locked = submitted || voiceActive;
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isRequiresAction = status?.type === "requires-action";
  const [prevRequiresAction, setPrevRequiresAction] = useState(isRequiresAction);
  const [attempt, setAttempt] = useState(0);
  const attemptRef = useRef(attempt);
  useLayoutEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);
  if (isRequiresAction !== prevRequiresAction) {
    setPrevRequiresAction(isRequiresAction);
    if (isRequiresAction) {
      setSubmitted(false);
      setConfirmingId(null);
      setAnswer("");
      setError(null);
      setAttempt(attempt + 1);
    }
  }
  const pendingGroupRef = useRef<HTMLDivElement | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const focusReceiptRef = useRef<string | null | undefined>(null);
  useLayoutEffect(() => {
    if (carryFocusRef.current) {
      carryFocusRef.current = false;
      pendingGroupRef.current?.focus({ preventScroll: true });
    }
    return () => {
      const element = pendingGroupRef.current ?? receiptRef.current;
      carryFocusRef.current = element?.contains(element.ownerDocument.activeElement) ?? false;
    };
  }, [carryFocusRef]);
  useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
    forwardedRef,
    () => pendingGroupRef.current ?? receiptRef.current,
  );
  const setReceipt = useCallback(
    (element: HTMLDivElement | null) => {
      receiptRef.current = element;
      if (!element) return;
      const shouldFocus = focusReceiptRef.current === approval?.id;
      focusReceiptRef.current = null;
      if (shouldFocus) element.focus({ preventScroll: true });
    },
    [approval?.id],
  );
  const setPendingGroup = useCallback(
    (element: HTMLDivElement | null) => {
      const group = pendingGroupRef.current;
      focusReceiptRef.current =
        !element && group?.contains(group.ownerDocument.activeElement) ? approval?.id : null;
      pendingGroupRef.current = element;
    },
    [approval?.id],
  );
  const hidePendingApproval =
    approval != null &&
    !isSettled(approval) &&
    status !== undefined &&
    status.type !== "requires-action" &&
    !(submitted && status.type === "running");
  useLayoutEffect(() => {
    if (hidePendingApproval) focusReceiptRef.current = null;
  }, [hidePendingApproval]);
  const focusPendingGroup = () => {
    const group = pendingGroupRef.current;
    if (group?.contains(group.ownerDocument.activeElement)) {
      group.focus({ preventScroll: true });
    }
  };

  if (approval != null && isSettled(approval))
    return (
      <ToolFallbackApprovalReceipt
        approval={approval}
        receiptRef={setReceipt}
        className={className}
        {...props}
      />
    );

  if (hidePendingApproval || !offersInterruptAction(status, approval, interrupt)) return null;

  const promptText = approval?.prompt ? (
    <p className="aui-tool-fallback-approval-prompt text-foreground whitespace-pre-line">
      {approval.prompt}
    </p>
  ) : null;

  if (!canAnswer)
    return (
      promptText && (
        <div
          data-slot="tool-fallback-approval"
          tabIndex={-1}
          className={cn("aui-tool-fallback-approval flex flex-col gap-2 pt-1", className)}
          {...props}
          ref={setPendingGroup}
        >
          {promptText}
        </div>
      )
    );

  // A declared option list is a host constraint: the kit never adds an
  // approval path beyond it, and preserves a refusal path only where the
  // request is an action the user may refuse.
  const declaredOptions = respondToApproval ? approval?.options : undefined;
  const acceptsText =
    approval != null && respondToApproval != null && toolApprovalAcceptsText(approval);

  // A refused response leaves the request open, so the controls come back
  // rather than staying spent on a decision the runtime never recorded.
  const submit = (send: () => Promise<void> | void) => {
    focusPendingGroup();
    setSubmitted(true);
    setConfirmingId(null);
    setError(null);
    void (async () => {
      try {
        await send();
      } catch (sendError) {
        if (attemptRef.current !== attempt) return;
        setSubmitted(false);
        setError(sendError instanceof Error ? sendError.message : String(sendError));
      }
    })();
  };

  const respond = (approved: boolean) => {
    if (locked) return;
    if (approval != null && approval.approved === undefined && respondToApproval) {
      submit(() => respondToApproval({ approved, ...typedNote() }));
    } else if (interrupt) {
      submit(() => resume?.({ approved }));
    } else if (status?.type === "requires-action" && status.reason === "interrupt") {
      return;
    } else {
      submit(() => addResult?.(approved ? APPROVED_RESULT : DENIED_RESULT));
    }
  };

  const respondWithOption = (option: ToolApprovalOption) => {
    if (locked) return;
    // A custom kind has no decision class for the runtime to derive, and
    // responding without one throws; picking a declared option is an answer,
    // so it resolves as approved.
    submit(() =>
      respondToApproval?.(
        isKnownKind(option.kind)
          ? { optionId: option.id, ...typedNote() }
          : { optionId: option.id, approved: true, ...typedNote() },
      ),
    );
  };

  const typedNote = () => (answer.trim() ? { text: answer } : {});

  // The kit does not validate an answer the request never constrained: a host
  // that cannot record an empty one rejects it, which reopens the controls.
  const submitAnswer = () => {
    if (locked) return;
    submit(() => respondToApproval?.({ text: answer }));
  };

  // A dismissal is no answer at all, so a typed draft does not travel with it.
  const dismiss = () => {
    if (locked) return;
    submit(() => respondToApproval?.({ approved: false }));
  };

  const handleOption = (option: ToolApprovalOption) => {
    if (option.confirm) {
      focusPendingGroup();
      setConfirmingId(option.id);
    } else {
      respondWithOption(option);
    }
  };

  const confirming =
    confirmingId != null ? declaredOptions?.find((o) => o.id === confirmingId) : undefined;

  const question = isQuestion(approval);
  const dismissible = question && respondToApproval != null && approval?.dismissible === true;

  const dismissButton = dismissible ? (
    <Button
      size="sm"
      variant="outline"
      className={approvalPressableClass}
      onClick={dismiss}
      disabled={locked}
    >
      Dismiss
    </Button>
  ) : null;

  const errorText = error ? (
    <p
      role="alert"
      className="aui-tool-fallback-approval-error text-destructive text-xs whitespace-pre-line"
    >
      {error}
    </p>
  ) : null;

  const answerField = acceptsText ? (
    <div className="aui-tool-fallback-approval-answer flex flex-col items-start gap-2">
      <Textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        disabled={locked}
        aria-label={question ? (approval?.prompt ?? "Answer") : "Note"}
        placeholder={question ? "Type your answer" : "Add a note to your decision"}
      />
      {question && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className={approvalPressableClass}
            onClick={submitAnswer}
            disabled={locked}
          >
            Send
          </Button>
          {dismissButton}
        </div>
      )}
    </div>
  ) : null;

  if (approval?.display === "questions" && respondToApproval) {
    return (
      <div
        data-slot="tool-fallback-approval"
        tabIndex={-1}
        className={cn("aui-tool-fallback-approval flex flex-col gap-3 pt-1", className)}
        {...props}
        ref={setPendingGroup}
      >
        {promptText}
        <ToolFallbackApprovalQuestions
          questions={approval.questions ?? []}
          dismissible={approval.dismissible === true}
          locked={locked}
          onSend={(answers) => submit(() => respondToApproval({ answers }))}
          onDismiss={dismiss}
        />
        {errorText}
      </div>
    );
  }

  if (confirming)
    return (
      <ToolFallbackApprovalConfirmation
        confirming={confirming}
        className={className}
        containerProps={props}
        containerRef={setPendingGroup}
        locked={locked}
        onConfirm={() => respondWithOption(confirming)}
        onBack={() => {
          focusPendingGroup();
          setConfirmingId(null);
        }}
      />
    );

  if (declaredOptions && declaredOptions.length > 0) {
    const allowOptions = declaredOptions.filter((o) => isAllowKind(o.kind));
    const customOptions = declaredOptions.filter((o) => !isKnownKind(o.kind));
    const rejectOptions = declaredOptions.filter(
      (o) => isKnownKind(o.kind) && !isAllowKind(o.kind),
    );
    return (
      <div
        data-slot="tool-fallback-approval"
        tabIndex={-1}
        className={cn("aui-tool-fallback-approval flex flex-col gap-2 pt-1", className)}
        {...props}
        ref={setPendingGroup}
      >
        {promptText}
        <div className="flex flex-wrap items-center gap-2">
          {[...allowOptions, ...customOptions, ...rejectOptions].map((option) => (
            <Button
              key={option.id}
              size="sm"
              variant={option === allowOptions[0] ? "default" : "outline"}
              className={approvalPressableClass}
              onClick={() => handleOption(option)}
              disabled={locked}
            >
              {approvalOptionLabel(option)}
            </Button>
          ))}
          {rejectOptions.length === 0 && !question && (
            <Button
              size="sm"
              variant="outline"
              className={approvalPressableClass}
              onClick={() => respond(false)}
              disabled={locked}
            >
              Deny
            </Button>
          )}
          {!acceptsText && dismissButton}
        </div>
        {answerField}
        {errorText}
      </div>
    );
  }

  // A question carries no decision to fabricate, so it renders only what the
  // request declared, even when that leaves nothing to act on here.
  if (question) {
    return (
      <div
        data-slot="tool-fallback-approval"
        tabIndex={-1}
        className={cn("aui-tool-fallback-approval flex flex-col gap-2 pt-1", className)}
        {...props}
        ref={setPendingGroup}
      >
        {promptText}
        {answerField}
        {!acceptsText && dismissButton && (
          <div className="flex items-center gap-2">{dismissButton}</div>
        )}
        {errorText}
      </div>
    );
  }

  return (
    <div
      data-slot="tool-fallback-approval"
      tabIndex={-1}
      className={cn("aui-tool-fallback-approval flex flex-col gap-2 pt-1", className)}
      {...props}
      ref={setPendingGroup}
    >
      {promptText}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className={approvalPressableClass}
          onClick={() => respond(true)}
          disabled={locked}
        >
          Allow
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={approvalPressableClass}
          onClick={() => respond(false)}
          disabled={locked}
        >
          Deny
        </Button>
      </div>
      {answerField}
      {errorText}
    </div>
  );
}
