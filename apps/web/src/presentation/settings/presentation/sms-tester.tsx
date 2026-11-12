// TJ-ARCH-MOB-001 compliant
// settings.html `smsTester()`: send a test SMS (static). A number ending 0000
// simulates a carrier rejection; the copy names the cause, then the fix (F9:
// the Telnyx code is secondary detail, never the message).
import { Button } from "@know-meet/ui/components/button";
import { useLayoutEffect, useRef, useState } from "react";
import { formatTime } from "../../workspace/application/format";
import { checkField, validatePhone } from "../application/validators";
import { InputGroup, TextField } from "./settings-fields";
import { BusyContent, Note, Stack } from "./settings-parts";
import { useBusyAction } from "./use-static-delay";

const RULE = { label: "Send a test to", required: true, validate: validatePhone } as const;

export interface SmsTestResult {
  readonly ok: boolean;
  readonly to: string;
  readonly at: string;
}

type Outcome = { readonly kind: "sending" | "ok" | "fail"; readonly to: string; readonly time?: string };

export function SmsTester({ idPrefix, onResult }: { readonly idPrefix: string; readonly onResult?: (result: SmsTestResult) => void }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const sending = useBusyAction();
  const groupRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (attempt > 0) groupRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);
  return (
    <Stack>
      <div ref={groupRef}>
        <InputGroup className="items-end">
          <TextField
            id={`${idPrefix}-sms-test`}
            label="Send a test to"
            required
            kind="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 415 555 0142"
            value={phone}
            error={error}
            onValueChange={(value) => {
              setPhone(value);
              if (error !== null && checkField(RULE, value) === null) setError(null);
            }}
          />
          <Button
            variant="secondary"
            disabled={sending.busy}
            aria-busy={sending.busy || undefined}
            onClick={() => {
              const message = checkField(RULE, phone);
              setError(message);
              if (message !== null) {
                setAttempt((n) => n + 1);
                return;
              }
              const to = phone.trim();
              setOutcome({ kind: "sending", to });
              sending.start(1600, () => {
                const now = new Date();
                const failed = /0000$/.test(to.replace(/\D/g, ""));
                setOutcome({ kind: failed ? "fail" : "ok", to, time: formatTime(now) });
                onResult?.({ ok: !failed, to, at: `Today at ${formatTime(now)}` });
              });
            }}
          >
            <BusyContent busy={sending.busy} busyLabel="Sending…" icon="send">
              Send test SMS
            </BusyContent>
          </Button>
        </InputGroup>
      </div>
      <div aria-live="polite">
        {outcome === null ? null : outcome.kind === "sending" ? (
          <p className="text-sm text-muted-foreground">
            Sending to <span className="font-mono text-13">{outcome.to}</span>…
          </p>
        ) : outcome.kind === "ok" ? (
          <Note kind="ok" icon="check">
            <p>
              <b>Delivered. </b>Telnyx confirmed delivery to {outcome.to} at {outcome.time}.
            </p>
          </Note>
        ) : (
          <Note kind="err" icon="alert">
            <p>
              <b>Not delivered. </b>The destination carrier rejected the message — the number may be a landline or unreachable by SMS. Try a mobile number that can receive texts.
            </p>
            <p>Provider code: Telnyx 40300</p>
          </Note>
        )}
      </div>
    </Stack>
  );
}
