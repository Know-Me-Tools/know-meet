/**
 * Human-in-the-loop approval over AG-UI 1.0 interrupts:
 * run 1 ends with RUN_FINISHED outcome "interrupt"; the client resumes with a
 * new run whose RunAgentInput.resume carries { interruptId, status, payload: { approved } }.
 */
import type { ScenarioFile, ScenarioRun, WireItem } from "../../domain/scenario.ts";
import type { ExpectedMessage } from "../../domain/expected.ts";
import { approvalInterrupt, runError, runFinished, runStarted, textMessage, toolCall, toolResult } from "../event-builders.ts";
import { defineScenario, userTurn } from "../scenario-base.ts";

const PROMPT = "Email the meeting summary to everyone who attended.";
const INTRO = "I drafted the summary email. Sending email needs your approval.";
const TOOL_ID = "tc-email-1";
const TOOL_NAME = "send_summary_email";
const TOOL_ARGS = { to: ["ana@know-me.tools", "ben@know-me.tools", "chi@know-me.tools", "dee@know-me.tools"], subject: "Meeting summary" };
const APPROVED_TEXT = "Sent the summary to 4 attendees.";
const REJECTED_TEXT = "OK, I did not send the email.";

function interruptId(variant: string): string {
  return `int-email-${variant}`;
}

function initialRun(variant: string, expiresInMs: number): ScenarioRun {
  const items: WireItem[] = [
    runStarted(),
    ...textMessage("msg-hitl-1", INTRO),
    ...toolCall(TOOL_ID, TOOL_NAME, TOOL_ARGS, "msg-hitl-1"),
    runFinished({
      type: "interrupt",
      interrupts: [approvalInterrupt(interruptId(variant), TOOL_ID, "Send the meeting summary to 4 attendees?")],
    }),
  ];
  return { trigger: { kind: "initial" }, items, rewrites: { interruptExpiresInMs: expiresInMs } };
}

function approvedRun(variant: string): ScenarioRun {
  return {
    trigger: { kind: "resume", interruptId: interruptId(variant), status: "resolved", approved: true },
    items: [
      runStarted(),
      toolResult("res-email-1", TOOL_ID, JSON.stringify({ sent: true, recipients: 4 })),
      ...textMessage("msg-hitl-2", APPROVED_TEXT),
      runFinished({ type: "success" }),
    ],
  };
}

function rejectedRun(variant: string, status: "resolved" | "cancelled"): ScenarioRun {
  return {
    trigger: status === "resolved"
      ? { kind: "resume", interruptId: interruptId(variant), status, approved: false }
      : { kind: "resume", interruptId: interruptId(variant), status },
    items: [
      runStarted(),
      toolResult("res-email-1", TOOL_ID, JSON.stringify({ sent: false, reason: "rejected by user" })),
      ...textMessage("msg-hitl-2", REJECTED_TEXT),
      runFinished({ type: "success" }),
    ],
  };
}

function expiredRun(variant: string): ScenarioRun {
  return {
    trigger: { kind: "resume-after-expiry", interruptId: interruptId(variant) },
    items: [runStarted(), runError("Interrupt int-email-expire expired before it was answered.", "INTERRUPT_EXPIRED")],
  };
}

function baseMessages(): ExpectedMessage[] {
  return [userTurn(PROMPT), { id: "msg-hitl-1", role: "assistant", textEquals: INTRO, status: "complete" }];
}

export function hitlApproveScenario(): ScenarioFile {
  return defineScenario({
    id: "hitl-approve",
    title: "HITL approval: approve with the keyboard",
    description: "Tool call gated by a tool_call interrupt; the user approves using only the keyboard; the resumed run returns the tool result.",
    tags: ["@hitl", "@a11y", "@keyboard"],
    userPrompt: PROMPT,
    runs: [initialRun("approve", 120_000), approvedRun("approve"), rejectedRun("approve", "resolved")],
    interactions: [{ do: "approve", interruptId: interruptId("approve"), via: "keyboard" }],
    expected: {
      runStatus: "finished",
      noProtocolErrors: true,
      messages: [...baseMessages(), { id: "msg-hitl-2", role: "assistant", textEquals: APPROVED_TEXT, status: "complete" }],
      toolCalls: [{ id: TOOL_ID, name: TOOL_NAME, args: TOOL_ARGS, status: "complete", resultIncludes: "\"sent\":true" }],
      interrupts: [{ id: interruptId("approve"), status: "approved" }],
      server: {
        requestCount: 2,
        resumeEntries: [{ interruptId: interruptId("approve"), status: "resolved", approved: true }],
      },
    },
  });
}

export function hitlRejectScenario(): ScenarioFile {
  return defineScenario({
    id: "hitl-reject",
    title: "HITL approval: reject with the keyboard",
    description: "Same gate; the user rejects. Rejection is status \"resolved\" with approved:false (not \"cancelled\", which means abandoned).",
    tags: ["@hitl", "@a11y", "@keyboard"],
    userPrompt: PROMPT,
    runs: [initialRun("reject", 120_000), rejectedRun("reject", "resolved"), rejectedRun("reject", "cancelled"), approvedRun("reject")],
    interactions: [{ do: "reject", interruptId: interruptId("reject"), via: "keyboard" }],
    expected: {
      runStatus: "finished",
      noProtocolErrors: true,
      messages: [...baseMessages(), { id: "msg-hitl-2", role: "assistant", textEquals: REJECTED_TEXT, status: "complete" }],
      toolCalls: [{ id: TOOL_ID, name: TOOL_NAME, args: TOOL_ARGS, status: "rejected", resultIncludes: "rejected by user" }],
      interrupts: [{ id: interruptId("reject"), status: "rejected" }],
      server: {
        requestCount: 2,
        resumeEntries: [{ interruptId: interruptId("reject"), status: "resolved", approved: false }],
      },
    },
  });
}

export function hitlExpireScenario(): ScenarioFile {
  return defineScenario({
    id: "hitl-expire",
    title: "HITL approval: request expires unanswered",
    description:
      "The interrupt's expiresAt is rewritten to now + 3 s at serve time. The UI must show the request as expired, " +
      "disable approve/reject, and must not send a resolved resume after expiry. The scenario still defines the " +
      "server's answer to a late resume (RUN_ERROR INTERRUPT_EXPIRED) so a late send is observable, not silent.",
    tags: ["@hitl", "@expiry"],
    userPrompt: PROMPT,
    runs: [initialRun("expire", 3_000), expiredRun("expire"), approvedRun("expire"), rejectedRun("expire", "resolved")],
    interactions: [{ do: "wait-for-expiry", interruptId: interruptId("expire") }],
    expected: {
      runStatus: "interrupted",
      noProtocolErrors: true,
      messages: baseMessages(),
      toolCalls: [{ id: TOOL_ID, name: TOOL_NAME, args: TOOL_ARGS, status: "expired" }],
      interrupts: [{ id: interruptId("expire"), status: "expired" }],
      server: { requestCount: 1, noResolvedResumeAfterExpiry: true },
      dom: [
        { selector: `[data-testid='km-approval'][data-status='expired']`, count: 1 },
        { selector: `[data-testid='km-approval-approve']:not([disabled]):not([aria-disabled='true'])`, count: 0 },
      ],
    },
  });
}
