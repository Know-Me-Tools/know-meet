// TJ-ARCH-MOB-001 compliant
// settings.html `#templates`: edit the summary email, summary SMS and invite
// templates; previews update as you type ({meeting}, {host}, {date} filled from
// the sample meetings). SMS counters show length and segments; more than two
// segments is an error. Save validates on submit and focuses the first problem.
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { useState } from "react";
import { formatDate, formatDay, formatMinutes } from "../../workspace/application/format";
import type { Meeting, Workspace } from "../../workspace/domain/workspace";
import { DEFAULT_TEMPLATES, SAMPLE_SUMMARY, SUMMARY_SHORT_LINK } from "../application/settings-fixtures";
import { fillTemplate, smsStats } from "../application/sms-stats";
import type { FieldRule } from "../application/validators";
import type { MessageTemplates } from "../domain/settings";
import { ConfirmDialog, type ConfirmRequest } from "./confirm-dialog";
import { EmailPreview, FakeButton, SmsPreview } from "./message-previews";
import { TextField } from "./settings-fields";
import { FormFoot, Note, Panel, RequiredNote, Stack, StatusChip } from "./settings-parts";
import { SettingsHead } from "./settings-shell";
import { useFormErrors } from "./use-form-errors";
import { SettingsLink } from "./settings-link";

type TemplateKey = keyof MessageTemplates;

const RULES: Readonly<Record<TemplateKey, FieldRule>> = {
  subject: { label: "Email subject", required: true },
  intro: { label: "Email intro", required: true },
  sms: { label: "SMS intro", required: true },
  inviteSubject: { label: "Invite email subject", required: true },
  inviteSms: { label: "Invite SMS intro", required: true },
};

function SmsCounter({ text }: { readonly text: string }) {
  const stats = smsStats(text);
  return (
    <div aria-live="polite" className="flex flex-wrap items-center gap-s2 text-sm text-muted-foreground">
      <span className="font-mono text-13">{`${stats.length} / ${stats.limit}`}</span>
      <span>characters</span>
      <StatusChip tone={stats.segments > 2 ? "red" : "green"}>{`${stats.segments} ${stats.segments === 1 ? "segment" : "segments"}`}</StatusChip>
      {stats.gsm ? null : <span className="text-xs">Special characters use 70-character segments.</span>}
    </div>
  );
}

function TemplateGrid({ children }: { readonly children: React.ReactNode }) {
  return <div className="grid grid-cols-2 items-start gap-s5 max-bp1024:grid-cols-[minmax(0,1fr)] *:min-w-0">{children}</div>;
}

function inviteSmsText(template: string, meeting: Meeting): string {
  return `${fillTemplate(template, meeting)} Join: meet.know-me.tools/j/${meeting.joinCode} Dial-in: ${meeting.dialIn.number} PIN ${meeting.dialIn.pin}# Reply STOP to opt out.`;
}

export function TemplatesSection({ workspace, userName }: { readonly workspace: Workspace; readonly userName: string }) {
  const [t, setT] = useState<MessageTemplates>(DEFAULT_TEMPLATES);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const { formRef, errors, validate, revalidate, setError } = useFormErrors(RULES);
  const summaryMeeting = workspace.meetings.find((m) => m.id === "partner-onboarding");
  const nextMeeting = workspace.meetings.find((m) => m.id === "cohort-kickoff");
  if (summaryMeeting === undefined || nextMeeting === undefined) return null;
  const from = workspace.telnyx.smsFrom;
  const smsText = `${fillTemplate(t.sms, summaryMeeting)} ${SUMMARY_SHORT_LINK} Reply STOP to opt out.`;
  const inviteSms = inviteSmsText(t.inviteSms, nextMeeting);
  const smsSegments = smsStats(smsText).segments;
  const set = (key: TemplateKey) => (value: string) => {
    setT((current) => ({ ...current, [key]: value }));
    revalidate(key, value);
  };

  return (
    <>
      <SettingsHead
        section="templates"
        title="Message templates"
        description="What participants receive. Edit the subject and intro; previews update as you type."
        actions={
          <SettingsLink hash="delivery" className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}>
            <KmIcon name="settings" />
            <span>Delivery settings</span>
          </SettingsLink>
        }
      />
      <div role="group" aria-label="Available placeholders" className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm text-muted-foreground">Placeholders:</span>
        <code>{"{meeting}"}</code>
        <code>{"{host}"}</code>
        <code>{"{date}"}</code>
      </div>
      <form
        ref={formRef}
        noValidate
        className="grid gap-s5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!validate(t)) return;
          if (smsSegments > 2 || smsStats(inviteSms).segments > 2) {
            setError("sms", "Shorten this so the SMS fits in 2 segments.");
            return;
          }
          toast.add({ title: "Templates saved", type: "success" });
        }}
      >
        <Panel title="Summary email" description="Sent at meeting close to recipients chosen in delivery settings.">
          <TemplateGrid>
            <Stack>
              <TextField id="tpl-subject" label="Email subject" required maxLength={120} value={t.subject} error={errors.subject} onValueChange={set("subject")} />
              <TextField id="tpl-intro" label="Email intro" kind="textarea" required maxLength={400} rows={4} value={t.intro} error={errors.intro} onValueChange={set("intro")} />
            </Stack>
            <EmailPreview label="Summary email preview" from="Know Meet <summaries@know-me.tools>" to="avery.chen@northwind.io" subject={fillTemplate(t.subject, summaryMeeting)}>
              <h3>{summaryMeeting.title}</h3>
              <p className="text-muted-foreground">
                {`${formatDay(summaryMeeting.start)} · ${formatMinutes(summaryMeeting.durationMin)} · Hosted by ${summaryMeeting.host}`}
              </p>
              <p>{fillTemplate(t.intro, summaryMeeting)}</p>
              <h4>Summary</h4>
              <p>{SAMPLE_SUMMARY.paragraph}</p>
              <h4>Action items</h4>
              <ul className="m-0 grid gap-1 pl-[18px]">
                {SAMPLE_SUMMARY.actions.map((a) => (
                  <li key={a.title}>
                    <b>{a.title}</b>
                    {` — ${a.owner}, due ${a.due}`}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-s2">
                <FakeButton variant="default">Read the transcript</FakeButton>
                <FakeButton variant="secondary">Watch the recording</FakeButton>
              </div>
              <p className="text-xs text-muted-foreground">Links expire in 30 days. You received this because you joined this meeting.</p>
            </EmailPreview>
          </TemplateGrid>
        </Panel>
        <Panel title="Summary SMS" description="Sent via Telnyx to participants with a phone number. Keep it to 2 segments.">
          <TemplateGrid>
            <Stack>
              <TextField id="tpl-sms" label="SMS intro" required maxLength={200} value={t.sms} error={errors.sms} onValueChange={set("sms")} />
              <SmsCounter text={smsText} />
              {smsSegments > 2 ? (
                <Note kind="err" icon="alert">
                  {`This SMS needs ${smsSegments} segments. Shorten the intro to fit in 2 or fewer.`}
                </Note>
              ) : null}
            </Stack>
            <SmsPreview from={from} text={smsText} />
          </TemplateGrid>
        </Panel>
        <Panel title="Invites" description="What invitees receive by email and SMS. Invitees never need an account.">
          <TemplateGrid>
            <Stack>
              <TextField id="tpl-invite-subject" label="Invite email subject" required maxLength={120} value={t.inviteSubject} error={errors.inviteSubject} onValueChange={set("inviteSubject")} />
              <TextField id="tpl-invite-sms" label="Invite SMS intro" required maxLength={160} value={t.inviteSms} error={errors.inviteSms} onValueChange={set("inviteSms")} />
              <SmsCounter text={inviteSms} />
            </Stack>
            <Stack>
              <EmailPreview label="Invite email preview" from={`${userName} via Know Meet`} to="dana@lumenlabs.co" subject={fillTemplate(t.inviteSubject, nextMeeting)}>
                <h3>{nextMeeting.title}</h3>
                <p>{`${formatDate(nextMeeting.start)} · ${formatMinutes(nextMeeting.durationMin)}`}</p>
                <FakeButton variant="default">Join in browser</FakeButton>
                <p>
                  Or dial <b>{nextMeeting.dialIn.number}</b> and enter PIN <b>{`${nextMeeting.dialIn.pin}#`}</b>
                </p>
                <p className="text-xs text-muted-foreground">
                  No account needed. This meeting may be recorded and is transcribed live; you’ll be asked for consent before recording starts.
                </p>
              </EmailPreview>
              <SmsPreview from={from} text={inviteSms} />
            </Stack>
          </TemplateGrid>
        </Panel>
        <FormFoot>
          <Button type="submit">
            <KmIcon name="check" />
            <span>Save templates</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              setConfirm({
                title: "Reset templates?",
                body: "Your subject and intro text go back to the KnowMe defaults.",
                confirmLabel: "Reset",
                onConfirm: () => {
                  setT(DEFAULT_TEMPLATES);
                  toast.add({ title: "Templates reset", type: "success" });
                },
              })
            }
          >
            Reset to defaults
          </Button>
          <RequiredNote />
        </FormFoot>
      </form>
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
