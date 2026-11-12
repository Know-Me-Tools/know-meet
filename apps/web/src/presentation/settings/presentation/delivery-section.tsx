// TJ-ARCH-MOB-001 compliant
// settings.html `#delivery`: automatic delivery at meeting close, what to send,
// recipients, channels (SMS needs Telnyx; the sample is not connected), timing
// and link expiry. Save validates "at least one" groups and moves focus to the
// group with the error (F6).
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { FieldError } from "@know-meet/ui/components/field";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { useLayoutEffect, useState } from "react";
import { CheckRow, RadioChoices, SelectField, SwitchRow } from "./settings-fields";
import { BusyContent, FormFoot, Note, Panel, PanelSurface, Stack } from "./settings-parts";
import { SettingsHead } from "./settings-shell";
import { useBusyAction } from "./use-static-delay";
import { SettingsLink } from "./settings-link";

const DEFAULTS = { on: true, summary: true, actions: true, transcript: true, recording: true, email: true, sms: true } as const;
type DeliveryFlag = keyof typeof DEFAULTS;

const previewLink = cn(buttonVariants({ variant: "secondary" }), focusFillClass);
const inlineLink = cn("text-ember-text underline underline-offset-[3px]", focusFillClass);

export function DeliverySection() {
  const [flags, setFlags] = useState<Readonly<Record<DeliveryFlag, boolean>>>(DEFAULTS);
  const [recipients, setRecipients] = useState("all");
  const [timing, setTiming] = useState("immediate");
  const [expiry, setExpiry] = useState("30");
  const [error, setError] = useState<{ readonly group: "what" | "channels"; readonly attempt: number } | null>(null);
  const saving = useBusyAction();
  useLayoutEffect(() => {
    if (error === null) return;
    document.getElementById(error.group === "what" ? "w-summary" : "ch-email")?.focus();
  }, [error]);
  const set = (key: DeliveryFlag) => (checked: boolean) => {
    setFlags((current) => ({ ...current, [key]: checked }));
    setError(null);
  };
  const disabled = !flags.on;
  return (
    <>
      <SettingsHead
        section="delivery"
        title="Summary delivery"
        description="When a meeting closes, KnowMe generates a summary and action items and sends them with the transcript."
        actions={
          <SettingsLink hash="templates" className={previewLink}>
            <KmIcon name="eye" />
            <span>Preview messages</span>
          </SettingsLink>
        }
      />
      <PanelSurface aria-label="Automatic delivery">
        <SwitchRow
          label="Send automatically at meeting close"
          description="Turn off to send summaries yourself from each recording."
          checked={flags.on}
          onCheckedChange={set("on")}
        />
      </PanelSurface>
      <fieldset disabled={disabled} className="m-0 grid min-w-0 gap-s4 p-0 disabled:opacity-55">
        <legend className="sr-only">Delivery options</legend>
        <Panel title="What to send">
          <div role="group" aria-label="What to send" aria-describedby={error?.group === "what" ? "what-err" : undefined}>
            <CheckRow id="w-summary" label="Summary" description="A short narrative of the meeting and its decisions." checked={flags.summary} onCheckedChange={set("summary")} />
            <CheckRow id="w-actions" label="Action items" description="Each item with its owner and due date." checked={flags.actions} onCheckedChange={set("actions")} />
            <CheckRow id="w-transcript" label="Full transcript" description="Speaker-attributed, with timestamps." checked={flags.transcript} onCheckedChange={set("transcript")} />
            <CheckRow id="w-recording" label="Recording link" description="Only for recorded meetings." checked={flags.recording} onCheckedChange={set("recording")} />
            {error?.group === "what" ? <FieldError id="what-err">Choose at least one thing to send, or turn automatic delivery off.</FieldError> : null}
          </div>
        </Panel>
        <Panel title="Recipients">
          <RadioChoices
            name="recip"
            legend="Who receives it"
            value={recipients}
            onValueChange={setRecipients}
            options={[
              { value: "all", label: "All participants", description: "Including invitees without a KnowMe account — they open the link without signing in." },
              { value: "signed", label: "Only signed-in participants" },
              { value: "me", label: "Only me" },
            ]}
          />
        </Panel>
        <Panel title="Channels">
          <Stack gap="sm">
            <div role="group" aria-label="Channels" aria-describedby={error?.group === "channels" ? "ch-err" : undefined}>
              <CheckRow id="ch-email" label="Email" description="Full summary in the message body." checked={flags.email} onCheckedChange={set("email")} />
              <CheckRow id="ch-sms" label="SMS link via Telnyx" description="Needs Telnyx SMS — not connected yet." checked={flags.sms} onCheckedChange={set("sms")} />
              {error?.group === "channels" ? <FieldError id="ch-err">Choose at least one channel.</FieldError> : null}
            </div>
            <Note kind="warn" icon="sms">
              <p>
                SMS links won’t send until you{" "}
                <SettingsLink hash="telnyx-sms" className={inlineLink}>
                  connect Telnyx SMS
                </SettingsLink>
                .
              </p>
            </Note>
          </Stack>
        </Panel>
        <Panel title="Timing">
          <Stack>
            <RadioChoices
              name="timing"
              legend="When to send"
              value={timing}
              onValueChange={setTiming}
              options={[
                { value: "immediate", label: "Immediately when processing completes" },
                { value: "review", label: "After I review", description: "Hold summaries until you approve them." },
              ]}
            />
            {timing === "review" ? (
              <Note kind="info" icon="clock">
                Summaries wait in a review queue on each recording’s Delivery tab. Nothing is sent until you approve it.
              </Note>
            ) : null}
            <SelectField
              label="Links expire after"
              value={expiry}
              hint="Applies to transcript and recording links for people without an account."
              options={[["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["never", "Never"]]}
              onValueChange={setExpiry}
            />
          </Stack>
        </Panel>
      </fieldset>
      <FormFoot>
        <Button
          disabled={saving.busy}
          aria-busy={saving.busy || undefined}
          onClick={() => {
            const attempt = (error?.attempt ?? 0) + 1;
            if (flags.on && !(flags.summary || flags.actions || flags.transcript || flags.recording)) {
              setError({ group: "what", attempt });
              return;
            }
            if (flags.on && !(flags.email || flags.sms)) {
              setError({ group: "channels", attempt });
              return;
            }
            saving.start(700, () => toast.add({ title: "Delivery settings saved", type: "success" }));
          }}
        >
          <BusyContent busy={saving.busy} busyLabel="Saving…" icon="check">
            Save delivery settings
          </BusyContent>
        </Button>
        <SettingsLink hash="templates" className={previewLink}>
          <KmIcon name="eye" />
          <span>Preview</span>
        </SettingsLink>
      </FormFoot>
    </>
  );
}
