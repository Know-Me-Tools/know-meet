// TJ-ARCH-MOB-001 compliant
// dashboard.html `#schedule` and `#schedule?edit=<id>`: the schedule form and its
// live invite preview. Validation runs on submit (F6): an error summary announces
// what to fix, every failing field is marked invalid with its error line, and focus
// moves to the first invalid field. Saving is simulated locally (static phase).
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { PageHead, PageHeadText, PageSub, PageTitle } from "@know-meet/ui/components/page-head";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { focusFirstError } from "../../shared/focus-first-error";
import { useSessionUser } from "../../shared/session";
import { useDocumentTitle } from "../../shared/use-document-title";
import { newJoinCode, timeZoneLabel } from "../application/dashboard-fixtures";
import { buildInvitePreview, initialScheduleValues, type ScheduleError, type ScheduleValues, validateSchedule } from "../application/schedule-form";
import { buildScheduledMeeting } from "../application/schedule-result";
import { type DashboardMeeting, MAX_FILE_BYTES } from "../domain/dashboard";
import { commitInvitees } from "../domain/invitee-rules";
import { useDashboard } from "./dashboard-context";
import { busySpinClass, DashTabs, MeetingsCrumbs } from "./dashboard-parts";
import { RequiredMark } from "./form-field";
import { InviteesSection } from "./invitees-section";
import { NotFoundView } from "./not-found-view";
import { SchedulePreviewPanel } from "./schedule-preview-panel";
import { AgentsSection, CalendarSection, DetailsSection, KnowledgeSection, OptionsSection } from "./schedule-sections";
import { ScheduledView } from "./scheduled-view";

const SAVE_MS = 1300;

export function ScheduleView({ editId }: { readonly editId: string | undefined }) {
  const { getMeeting } = useDashboard();
  const [round, setRound] = useState(0);
  const editing = editId === undefined ? null : getMeeting(editId);
  if (editId !== undefined && (editing === null || editing.cancelled)) return <NotFoundView id={editId} />;
  return <ScheduleForm key={`${editId ?? "new"}-${round}`} editing={editing} onReset={() => setRound((n) => n + 1)} />;
}

function ErrorSummary({ errors, editing }: { readonly errors: readonly ScheduleError[]; readonly editing: boolean }) {
  const things = errors.length === 1 ? "1 thing" : `${errors.length} things`;
  return (
    <div role="alert" className="grid gap-s2 rounded-tile bg-red-soft px-s5 py-s4">
      <h2 className="flex items-center gap-s2 text-lg">
        <KmIcon name="alert" className="text-red-text" />
        <span>
          Fix {things} before {editing ? "saving" : "scheduling"}
        </span>
      </h2>
      <ul className="m-0 pl-s5">
        {errors.map((error) => (
          <li key={error.id}>
            <a
              href={`#${error.id}`}
              className="font-medium text-foreground"
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(error.id)?.focus();
              }}
            >
              {error.label}: {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScheduleForm({ editing, onReset }: { readonly editing: DashboardMeeting | null; readonly onReset: () => void }) {
  const model = useDashboard();
  const { workspace, now, localTz, joinUrlFor } = model;
  const user = useSessionUser();
  const hostName = user?.name ?? workspace.user.name;
  useDocumentTitle(`${editing ? "Edit meeting" : "Schedule meeting"} · Know Meet`);

  const [values, setValues] = useState<ScheduleValues>(() => initialScheduleValues(editing, workspace, now, localTz, newJoinCode()));
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [summary, setSummary] = useState<readonly ScheduleError[]>([]);
  const [fileError, setFileError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DashboardMeeting | null>(null);
  const [attempt, setAttempt] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useLayoutEffect(() => {
    if (attempt > 0) focusFirstError(form.current);
  }, [attempt]);

  if (result !== null) {
    return <ScheduledView meeting={result} wasEdit={editing !== null} onScheduleAnother={onReset} />;
  }

  const update = (patch: Partial<ScheduleValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    const invalid = Object.keys(errors).filter((id) => id !== "f-invitee" && errors[id]);
    if (invalid.length) {
      const fresh = validateSchedule(next, errors["f-invitee"] ?? "", now);
      setErrors((current) => {
        const copy: Record<string, string> = { ...current };
        for (const id of invalid) copy[id] = fresh.find((e) => e.id === id)?.message ?? "";
        return copy;
      });
    }
  };

  const commitDraft = (): string => {
    if (draft.trim() === "") {
      setErrors((e) => ({ ...e, "f-invitee": "" }));
      return "";
    }
    const committed = commitInvitees(draft, values.invitees, workspace.people);
    setValues((v) => ({ ...v, invitees: committed.invitees }));
    setDraft(committed.rest);
    setErrors((e) => ({ ...e, "f-invitee": committed.error }));
    return committed.error;
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const committed = draft.trim() ? commitInvitees(draft, values.invitees, workspace.people) : null;
    const checked: ScheduleValues = committed ? { ...values, invitees: committed.invitees } : values;
    if (committed) {
      setValues(checked);
      setDraft(committed.rest);
    }
    const found = validateSchedule(checked, committed?.error ?? "", now);
    setErrors(Object.fromEntries(found.map((e) => [e.id, e.message])));
    setSummary(found);
    if (found.length) {
      setAttempt((n) => n + 1);
      return;
    }
    setBusy(true);
    timer.current = window.setTimeout(() => {
      const outcome = buildScheduledMeeting(checked, editing, workspace, new Date());
      if (editing) model.dispatch({ type: "override", id: editing.id, changes: outcome.meeting });
      else model.dispatch({ type: "create", meeting: outcome.meeting, deliveries: outcome.deliveries, preReads: checked.files });
      setResult(outcome.meeting);
    }, SAVE_MS);
  };

  const addFiles = (list: FileList) => {
    const tooBig: string[] = [];
    let files = values.files;
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_BYTES) tooBig.push(file.name);
      else if (!files.some((x) => x.name === file.name)) files = [...files, { name: file.name, size: file.size }];
    }
    update({ files });
    setFileError(tooBig.length ? `${tooBig.join(", ")} is over 50 MB. Share a link to it in the description instead.` : "");
  };

  const preview = buildInvitePreview(values, workspace, hostName, joinUrlFor(values.code), timeZoneLabel(values.tz, localTz));

  return (
    <>
      <PageHead>
        <PageHeadText>
          {editing ? <MeetingsCrumbs label={editing.title} /> : null}
          <PageTitle id="sched-h1">{editing ? "Edit meeting" : "Schedule a meeting"}</PageTitle>
          <PageSub>
            {editing
              ? "Invitees are notified of changes by the same channels as their invite."
              : "Invite anyone by email or phone. They join from the link or by dialing in — no account needed."}
          </PageSub>
        </PageHeadText>
      </PageHead>
      {editing ? null : <DashTabs active="schedule" />}
      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-s5 max-bp1024:grid-cols-[minmax(0,1fr)]">
        <form ref={form} noValidate aria-labelledby="sched-h1" className="grid min-w-0 gap-s4" onSubmit={onSubmit}>
          {summary.length ? <ErrorSummary errors={summary} editing={editing !== null} /> : null}
          <p className="text-sm text-muted-foreground">
            <RequiredMark /> Required
          </p>
          <DetailsSection values={values} update={update} errors={errors} disabled={busy} />
          <InviteesSection
            invitees={values.invitees}
            draft={draft}
            error={errors["f-invitee"] || undefined}
            disabled={busy}
            onDraftChange={setDraft}
            onCommit={commitDraft}
            onRemove={(index) => update({ invitees: values.invitees.filter((_, i) => i !== index) })}
          />
          <CalendarSection value={values.calendar} disabled={busy} onChange={(calendar) => update({ calendar })} />
          <OptionsSection options={values.options} disabled={busy} onChange={(options) => update({ options })} />
          <AgentsSection values={values} update={update} disabled={busy} />
          <KnowledgeSection
            files={values.files}
            error={fileError}
            disabled={busy}
            onAdd={addFiles}
            onRemove={(index) => update({ files: values.files.filter((_, i) => i !== index) })}
          />
          <div className="flex flex-wrap items-center justify-end gap-s2">
            <Link
              to="/dashboard"
              hash={editing ? `meeting:${editing.id}` : "upcoming"}
              className={cn(buttonVariants({ variant: "ghost" }), focusFillClass)}
            >
              Cancel
            </Link>
            <Button type="submit" disabled={busy} aria-busy={busy || undefined}>
              <KmIcon name={busy ? "refresh" : editing ? "check" : "send"} className={busy ? cn("size-4", busySpinClass) : undefined} />
              <span>{busy ? (editing ? "Saving…" : "Scheduling…") : editing ? "Save changes" : "Schedule meeting"}</span>
            </Button>
          </div>
        </form>
        <SchedulePreviewPanel preview={preview} from={hostName} />
      </div>
    </>
  );
}
