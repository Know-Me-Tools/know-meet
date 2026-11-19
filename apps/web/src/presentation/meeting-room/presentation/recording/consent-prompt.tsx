// TJ-ARCH-MOB-001 compliant
// The recording consent question (wc10 task 10.4; WC-8, WC-9; decisions D1, D2), the
// prototype `#consent-dlg` grammar on the kit AlertDialog. Shown to every other present
// participant when someone asks to record (`phase: asking`), and to a late joiner while
// a recording already runs (`running`): there a decline stops it for everyone and keeps
// what was written. It is a question that needs an answer, so it stays open until one
// of its two buttons answers it (Escape and the scrim do nothing). Neither answer is a
// default: focus starts on the decline button, the choice that changes nothing on
// anyone's device. Scenario contract: `km-recording-consent-prompt`, `-agree`,
// `-decline`.
import type { ConsentAnswer, ConsentPrompt as Prompt } from "@know-meet/domain";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@know-meet/ui/components/alert-dialog";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { useId } from "react";
import { type NameOf, promptText, RECORD_COPY, runningText } from "./recording-copy";

interface ConsentPromptProps {
  readonly prompt: Prompt | null;
  readonly nameOf: NameOf;
  readonly onAnswer: (answer: ConsentAnswer) => void;
}

export function ConsentPrompt({ prompt, nameOf, onAnswer }: ConsentPromptProps) {
  const declineId = useId();
  const running = prompt?.running ?? false;
  const requester = prompt === null ? "" : nameOf(prompt.requester);
  return (
    <AlertDialog open={prompt !== null} onOpenChange={() => undefined}>
      <AlertDialogContent
        data-testid="km-recording-consent-prompt"
        initialFocus={() => document.getElementById(declineId)}
      >
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-red-soft text-red-text">
            <KmIcon name="record" />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {running ? RECORD_COPY.runningTitle : RECORD_COPY.promptTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {running ? runningText(requester) : promptText(requester)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            id={declineId}
            variant="secondary"
            data-testid="km-recording-consent-decline"
            onClick={() => onAnswer("declined")}
          >
            {running ? RECORD_COPY.runningDecline : RECORD_COPY.promptDecline}
          </AlertDialogAction>
          <AlertDialogAction
            data-testid="km-recording-consent-agree"
            onClick={() => onAnswer("agreed")}
          >
            <KmIcon name="check" />
            <span>{running ? RECORD_COPY.runningAgree : RECORD_COPY.promptAgree}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
