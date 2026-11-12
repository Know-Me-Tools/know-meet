// TJ-ARCH-MOB-001 compliant
// dashboard.html schedule "Invitees" panel: type an email address or a phone
// number, press Enter or comma (or Add, or leave the field) to add it; each
// invitee shows the channels it will get. Errors give the cause, then the fix.
import { Button } from "@know-meet/ui/components/button";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { useRef } from "react";
import type { Invitee } from "../domain/dashboard";
import { channelsFor, channelText } from "../domain/invitee-rules";
import { useDashboard } from "./dashboard-context";
import { describedBy, FormField } from "./form-field";
import { Panel, PanelTitle } from "./schedule-sections";

interface InviteesSectionProps {
  readonly invitees: readonly Invitee[];
  readonly draft: string;
  readonly error: string | undefined;
  readonly disabled: boolean;
  readonly onDraftChange: (value: string) => void;
  /** Commits the draft; returns the first error ("" when everything was added). */
  readonly onCommit: () => string;
  readonly onRemove: (index: number) => void;
}

const HINT =
  "Press Enter or comma to add. Email addresses get an email invite; phone numbers get an SMS via Telnyx; people with both on file get both. Invitees don’t need an account.";

export function InviteesSection({ invitees, draft, error, disabled, onDraftChange, onCommit, onRemove }: InviteesSectionProps) {
  const { workspace } = useDashboard();
  const input = useRef<HTMLInputElement>(null);
  const count = invitees.length;
  return (
    <Panel labelledBy="s-inv">
      <div className="flex flex-wrap items-start justify-between gap-s3">
        <PanelTitle id="s-inv">Invitees</PanelTitle>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {count ? `${count} ${count === 1 ? "invitee" : "invitees"}` : "No invitees yet"}
        </span>
      </div>
      <FormField id="f-invitee" label="Add people by email or phone number" required hint={HINT} hintId="f-invitee-hint" error={error}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-s2">
          <Input
            ref={input}
            id="f-invitee"
            type="text"
            autoComplete="off"
            inputMode="email"
            list="people-list"
            placeholder="name@company.com or +1 415 555 0142"
            value={draft}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy("f-invitee", error, "f-invitee-hint")}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                onCommit();
              }
            }}
            onBlur={() => onCommit()}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => {
              onCommit();
              input.current?.focus();
            }}
          >
            <KmIcon name="plus" className="size-4" />
            <span>Add</span>
          </Button>
        </div>
      </FormField>
      <datalist id="people-list">
        {workspace.people.map((p) => (
          <option key={p.id} value={p.email} label={p.name} />
        ))}
      </datalist>
      <ul aria-label="Invitees added" className="m-0 grid list-none gap-s2 p-0">
        {invitees.map((inv, index) => {
          const named = inv.name !== inv.value;
          return (
            <li key={inv.key} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s3 rounded-base bg-card py-1.5 pr-1.5 pl-s3">
              <span className="grid size-8 place-items-center rounded-9 bg-muted">
                <KmIcon name={inv.kind === "email" ? "mail" : "sms"} className="size-4" />
              </span>
              <span className="grid min-w-0 gap-0.5 *:block">
                <span className="truncate text-sm" title={named ? `${inv.name} — ${inv.value}` : inv.value}>
                  {named ? <strong>{inv.name} </strong> : null}
                  <span className={named ? "text-muted-foreground" : undefined}>{inv.value}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Will receive: <b className="font-semibold text-foreground">{channelText(inv)}</b>
                  {named && channelsFor(inv).length === 2 ? " (contact on file)" : ""}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${inv.value}`}
                disabled={disabled}
                onClick={() => {
                  onRemove(index);
                  input.current?.focus();
                }}
              >
                <KmIcon name="x" className="size-4" />
              </Button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
