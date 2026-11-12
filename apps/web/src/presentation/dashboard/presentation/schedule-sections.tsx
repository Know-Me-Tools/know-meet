// TJ-ARCH-MOB-001 compliant
// The schedule form's panels (dashboard.html `renderSchedule` assemble): Details,
// Calendar, Meeting options, Agents to bring and Knowledge. Invitees live in
// invitees-section.tsx. Controlled by schedule-view.tsx.
import { buttonVariants } from "@know-meet/ui/components/button";
import { Checkbox } from "@know-meet/ui/components/checkbox";
import { AgentGlyph } from "@know-meet/ui/components/glyph";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { NativeSelect, NativeSelectOption } from "@know-meet/ui/components/native-select";
import { Orb } from "@know-meet/ui/components/orb";
import { Textarea } from "@know-meet/ui/components/textarea";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { formatBytes } from "../../workspace/application/format";
import { CALENDAR_ACCOUNTS, timeZoneOptions } from "../application/dashboard-fixtures";
import {
  type CalendarChoice,
  DURATION_OPTIONS,
  isoDate,
  type ScheduleOptions,
  type ScheduleValues,
} from "../application/schedule-form";
import type { PreRead } from "../domain/dashboard";
import { useDashboard } from "./dashboard-context";
import { StateLine, SwitchRow, smallLinkClass } from "./dashboard-parts";
import { describedBy, FormField } from "./form-field";

type Update = (patch: Partial<ScheduleValues>) => void;

export function Panel({
  labelledBy,
  children,
}: {
  readonly labelledBy: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-s4 rounded-lg bg-surface p-s5 shadow-(--shadow-card) max-bp768:p-s4"
    >
      {children}
    </section>
  );
}

export function PanelTitle({
  id,
  children,
}: {
  readonly id: string;
  readonly children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="text-lg">
      {children}
    </h2>
  );
}

interface DetailsProps {
  readonly values: ScheduleValues;
  readonly update: Update;
  readonly errors: Readonly<Record<string, string>>;
  readonly disabled: boolean;
}

export function DetailsSection({ values, update, errors, disabled }: DetailsProps) {
  const { now, localTz } = useDashboard();
  return (
    <Panel labelledBy="s-basics">
      <PanelTitle id="s-basics">Details</PanelTitle>
      <FormField id="f-title" label="Title" required error={errors["f-title"]}>
        <Input
          id="f-title"
          type="text"
          required
          maxLength={120}
          autoComplete="off"
          placeholder="e.g. Partner onboarding review"
          value={values.title}
          disabled={disabled}
          aria-invalid={errors["f-title"] ? true : undefined}
          aria-describedby={describedBy("f-title", errors["f-title"])}
          onChange={(e) => update({ title: e.target.value })}
        />
      </FormField>
      <div className="grid grid-cols-3 gap-s4 max-bp768:grid-cols-[minmax(0,1fr)]">
        <FormField id="f-date" label="Date" required error={errors["f-date"]}>
          <Input
            id="f-date"
            type="date"
            required
            min={isoDate(now)}
            value={values.date}
            disabled={disabled}
            aria-invalid={errors["f-date"] ? true : undefined}
            aria-describedby={describedBy("f-date", errors["f-date"])}
            onChange={(e) => update({ date: e.target.value })}
          />
        </FormField>
        <FormField id="f-time" label="Start time" required error={errors["f-time"]}>
          <Input
            id="f-time"
            type="time"
            required
            step={300}
            value={values.time}
            disabled={disabled}
            aria-invalid={errors["f-time"] ? true : undefined}
            aria-describedby={describedBy("f-time", errors["f-time"])}
            onChange={(e) => update({ time: e.target.value })}
          />
        </FormField>
        <FormField id="f-duration" label="Duration">
          <NativeSelect
            id="f-duration"
            value={values.duration}
            disabled={disabled}
            onChange={(e) => update({ duration: e.target.value })}
          >
            {DURATION_OPTIONS.map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      <FormField id="f-tz" label="Time zone">
        <NativeSelect
          id="f-tz"
          value={values.tz}
          disabled={disabled}
          onChange={(e) => update({ tz: e.target.value })}
        >
          {timeZoneOptions(localTz).map(([id, label]) => (
            <NativeSelectOption key={id} value={id}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      <FormField
        id="f-desc"
        label="Description"
        hint="Shown in the email and calendar event. Agents in the room can read it too."
        hintId="f-desc-hint"
      >
        <Textarea
          id="f-desc"
          rows={3}
          maxLength={1000}
          placeholder="Agenda, goals, anything invitees should know."
          value={values.description}
          disabled={disabled}
          aria-describedby="f-desc-hint"
          onChange={(e) => update({ description: e.target.value })}
        />
      </FormField>
    </Panel>
  );
}

export function CalendarSection({
  value,
  onChange,
  disabled,
}: {
  readonly value: CalendarChoice;
  readonly onChange: (v: CalendarChoice) => void;
  readonly disabled: boolean;
}) {
  return (
    <Panel labelledBy="s-cal">
      <PanelTitle id="s-cal">Calendar</PanelTitle>
      <FormField id="f-calendar" label="Add to calendar">
        <NativeSelect
          id="f-calendar"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "google" || next === "outlook" || next === "none") onChange(next);
          }}
        >
          <NativeSelectOption value="google">
            Google Calendar — {CALENDAR_ACCOUNTS.google.account}
          </NativeSelectOption>
          <NativeSelectOption value="outlook">
            Outlook — {CALENDAR_ACCOUNTS.outlook.account}
          </NativeSelectOption>
          <NativeSelectOption value="none">Don’t add to a calendar</NativeSelectOption>
        </NativeSelect>
      </FormField>
      <p className="flex items-start gap-s2 rounded-base bg-card p-s3 text-sm text-muted-foreground">
        <KmIcon name="info" className="mt-px size-[18px] text-cyan-text" />
        <span>
          The KnowMe join link and dial-in details are inserted into the calendar event, so they
          appear for everyone who gets it.
        </span>
      </p>
    </Panel>
  );
}

export function OptionsSection({
  options,
  onChange,
  disabled,
}: {
  readonly options: ScheduleOptions;
  readonly onChange: (o: ScheduleOptions) => void;
  readonly disabled: boolean;
}) {
  const { workspace } = useDashboard();
  const set = (key: keyof ScheduleOptions) => (checked: boolean) =>
    onChange({ ...options, [key]: checked });
  const [first, second] = workspace.telnyx.dialIn;
  const pin = workspace.meetings[0]?.dialIn.pin ?? "";
  return (
    <Panel labelledBy="s-opt">
      <PanelTitle id="s-opt">Meeting options</PanelTitle>
      <div>
        <SwitchRow
          id="opt-record"
          label="Record automatically"
          hint="Room Composite recording of all participants, saved to your storage and pinned to IPFS. Everyone sees a recording notice."
          checked={options.record}
          disabled={disabled}
          onCheckedChange={set("record")}
        />
        <SwitchRow
          id="opt-transcribe"
          label="Live transcription"
          hint="Transcript feeds the meeting’s knowledge base for every agent in the room."
          checked={options.transcribe}
          disabled={disabled}
          onCheckedChange={set("transcribe")}
        />
        <SwitchRow
          id="opt-summary"
          label="Send transcript & summary after the meeting"
          hint={
            <>
              Emailed to participants, with an SMS link for phone invitees.{" "}
              <Link to="/settings" hash="delivery">
                Delivery settings
              </Link>
            </>
          }
          checked={options.summary}
          disabled={disabled}
          onCheckedChange={set("summary")}
        />
        <SwitchRow
          id="opt-dialin"
          label="Allow phone dial-in"
          hint="Callers dial in to the room — inbound only."
          checked={options.dial}
          disabled={disabled}
          onCheckedChange={set("dial")}
        >
          {options.dial && first ? (
            <div
              id="dial-preview"
              className="mt-s2 flex flex-wrap gap-x-s4 gap-y-s2 rounded-base bg-card px-s3 py-s2 font-mono text-13"
            >
              <span className="inline-flex items-center gap-1">
                <KmIcon name="phone-in" className="size-4" /> {first.number} ({first.region})
              </span>
              {second ? (
                <span>
                  {second.number} ({second.region})
                </span>
              ) : null}
              <span>PIN {pin}</span>
            </div>
          ) : null}
        </SwitchRow>
        <SwitchRow
          id="opt-waiting"
          label="Waiting room"
          hint="You admit each person before they enter."
          checked={options.waiting}
          disabled={disabled}
          onCheckedChange={set("waiting")}
        />
      </div>
    </Panel>
  );
}

const pickClass =
  "grid min-h-14 cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-s3 rounded-base bg-card px-s3 py-s2";

export function AgentsSection({
  values,
  update,
  disabled,
}: {
  readonly values: ScheduleValues;
  readonly update: Update;
  readonly disabled: boolean;
}) {
  const { workspace } = useDashboard();
  const toggleAgent = (id: string, checked: boolean) =>
    update({
      agents: checked
        ? [...values.agents.filter((a) => a !== id), id]
        : values.agents.filter((a) => a !== id),
    });
  return (
    <Panel labelledBy="s-agents">
      <div className="flex flex-wrap items-start justify-between gap-s3">
        <div className="grid min-w-0 gap-0.5">
          <PanelTitle id="s-agents">Agents to bring</PanelTitle>
          <span className="text-sm text-muted-foreground">
            Concierge is always in the room. Pick the registered agents and dots to dispatch at
            start.
          </span>
        </div>
        <Link to="/agents" hash="registry" className={smallLinkClass}>
          Manage agents
        </Link>
      </div>
      <fieldset className="m-0 min-w-0 p-0">
        <legend className="sr-only">Agents and dots</legend>
        <div className="grid grid-cols-2 gap-s2 max-bp600:grid-cols-[minmax(0,1fr)]">
          {workspace.agents
            .filter((a) => !a.system)
            .map((agent) => (
              <label key={agent.id} className={pickClass}>
                <Checkbox
                  name="agent"
                  value={agent.id}
                  checked={values.agents.includes(agent.id)}
                  disabled={disabled}
                  onCheckedChange={(checked) => toggleAgent(agent.id, checked)}
                />
                <AgentGlyph size="sm">{agent.mono}</AgentGlyph>
                <span className="grid min-w-0 gap-0.5 *:block">
                  <strong className="text-sm">{agent.name}</strong>
                  <span className="truncate text-xs text-muted-foreground" title={agent.desc}>
                    {agent.role}
                  </span>
                  <StateLine
                    status={agent.status}
                    label={
                      agent.status === "online" ? "Online" : "Offline — joins if online at start"
                    }
                  />
                </span>
              </label>
            ))}
          <label className={pickClass}>
            <Checkbox
              name="dot"
              value="iris"
              checked={values.iris}
              disabled={disabled}
              onCheckedChange={(checked) => update({ iris: checked })}
            />
            <Orb className="w-7" />
            <span className="grid min-w-0 gap-0.5 *:block">
              <strong className="text-sm">Iris</strong>
              <span className="text-xs text-muted-foreground">Your dot · private memory</span>
            </span>
          </label>
        </div>
      </fieldset>
    </Panel>
  );
}

interface KnowledgeProps {
  readonly files: readonly PreRead[];
  readonly error: string;
  readonly disabled: boolean;
  readonly onAdd: (files: FileList) => void;
  readonly onRemove: (index: number) => void;
}

export function KnowledgeSection({ files, error, disabled, onAdd, onRemove }: KnowledgeProps) {
  return (
    <Panel labelledBy="s-know">
      <PanelTitle id="s-know">Knowledge</PanelTitle>
      <div className="grid justify-items-start gap-s2 rounded-base bg-card p-s4">
        <input
          id="f-files"
          type="file"
          multiple
          disabled={disabled}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.md,.txt,.csv,.png,.jpg"
          className="peer sr-only"
          aria-describedby={error ? "f-files-err" : undefined}
          onChange={(e) => {
            if (e.target.files) onAdd(e.target.files);
            e.target.value = "";
          }}
        />
        <label
          htmlFor="f-files"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "cursor-pointer peer-focus-visible:bg-focus! peer-focus-visible:text-on-focus!",
          )}
        >
          <KmIcon name="upload" className="size-4" />
          <span>Attach pre-reads</span>
        </label>
        <span className="text-sm text-muted-foreground">
          Added to this meeting’s knowledge base so agents can cite them. Up to 50 MB each.
        </span>
      </div>
      {error ? (
        <p id="f-files-err" className="flex items-center gap-1.5 text-sm font-medium">
          <KmIcon name="alert" className="size-4 text-red-text" />
          <span>{error}</span>
        </p>
      ) : null}
      <FileList files={files} onRemove={disabled ? undefined : onRemove} />
    </Panel>
  );
}

export function FileList({
  files,
  onRemove,
  emptyText = "No pre-reads attached.",
  metaSuffix = "",
}: {
  readonly files: readonly PreRead[];
  readonly onRemove?: (index: number) => void;
  readonly emptyText?: string;
  readonly metaSuffix?: string;
}) {
  return (
    <ul aria-label="Pre-reads attached" className="m-0 grid list-none gap-s2 p-0">
      {files.length === 0 ? <li className="text-sm text-muted-foreground">{emptyText}</li> : null}
      {files.map((file, index) => (
        <li
          key={file.name}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s3 rounded-base bg-card py-1 pr-1 pl-s3"
        >
          <KmIcon name="book" className="size-4" />
          <span className="grid min-w-0 *:block">
            <span className="truncate text-sm" title={file.name}>
              {file.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatBytes(file.size)}
              {metaSuffix}
            </span>
          </span>
          {onRemove ? (
            <RemoveFileButton name={file.name} onClick={() => onRemove(index)} />
          ) : (
            <span />
          )}
        </li>
      ))}
    </ul>
  );
}

function RemoveFileButton({
  name,
  onClick,
}: {
  readonly name: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Remove ${name}`}
      onClick={onClick}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "outline-none focus-visible:bg-focus! focus-visible:text-on-focus!",
      )}
    >
      <KmIcon name="trash" className="size-4" />
    </button>
  );
}
