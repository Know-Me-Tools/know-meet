// TJ-ARCH-MOB-001 compliant
// `#detail:<id>:summary`: generated summary, decisions and action items (check
// to mark done). Edit swaps in a labelled textarea; Save validates on submit only
// and, when empty, marks the field invalid, shows the error line and moves focus
// to it (F6). Regenerate is simulated (busy label, then a toast).
import { Badge } from "@know-meet/ui/components/badge";
import { Button } from "@know-meet/ui/components/button";
import { cardVariants } from "@know-meet/ui/components/card";
import { Checkbox } from "@know-meet/ui/components/checkbox";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Textarea } from "@know-meet/ui/components/textarea";
import { toast } from "@know-meet/ui/components/toast";
import { cn } from "@know-meet/ui/lib/utils";
import { useRef, useState } from "react";
import { formatDate } from "../../workspace/application/format";
import type { Recording } from "../../workspace/domain/workspace";
import type { ActionItem, RecordingSummary } from "../domain/recording-details";
import { BusyLabel } from "./busy-label";
import { useBusyTimer } from "./use-busy-timer";

const panelClass = cardVariants({ variant: "panel" });

function generatedLabel(recording: Recording): string {
  const at = new Date(new Date(recording.date).getTime() + (recording.durationMin + 3) * 60_000);
  return `Generated ${formatDate(at)}`;
}

function ActionRow({
  item,
  index,
  onToggle,
}: {
  readonly item: ActionItem;
  readonly index: number;
  readonly onToggle: (done: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-s3 py-s3">
      <Checkbox
        id={`act-${index}`}
        checked={item.done}
        onCheckedChange={(checked) => onToggle(checked)}
        className="mt-0.5"
      />
      <label htmlFor={`act-${index}`} className="cursor-pointer">
        <span
          className={cn(
            "block font-medium [overflow-wrap:anywhere]",
            item.done && "text-muted-foreground line-through",
          )}
        >
          {item.text}
        </span>
        <span className="block text-sm text-muted-foreground">{item.owner}</span>
      </label>
      <Badge className="whitespace-nowrap">
        <KmIcon name="calendar" />
        <span>Due {item.due}</span>
      </Badge>
    </div>
  );
}

function SummaryEditor({
  initial,
  onSave,
  onCancel,
}: {
  readonly initial: readonly string[];
  readonly onSave: (paragraphs: readonly string[]) => void;
  readonly onCancel: () => void;
}) {
  const [text, setText] = useState(initial.join("\n\n"));
  const [invalid, setInvalid] = useState(false);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const save = () => {
    const value = text.trim();
    if (value === "") {
      setInvalid(true);
      fieldRef.current?.focus();
      return;
    }
    onSave(
      value
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p !== ""),
    );
  };
  return (
    <div className={panelClass}>
      <div className="grid gap-1.5">
        <label htmlFor="sum-edit" className="text-sm font-semibold">
          Summary text
        </label>
        <p id="sum-hint" className="text-sm text-muted-foreground">
          Separate paragraphs with a blank line. Edits apply to future deliveries and resends.
        </p>
        <Textarea
          ref={fieldRef}
          id="sum-edit"
          rows={8}
          autoFocus
          aria-describedby={invalid ? "sum-hint sum-err" : "sum-hint"}
          aria-invalid={invalid}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        {invalid ? (
          <p id="sum-err" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <KmIcon name="alert" className="size-4 text-red-text" />
            <span>
              The summary can’t be empty. Write at least one sentence, or cancel to keep the current
              version.
            </span>
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-s2">
        <Button onClick={save}>
          <KmIcon name="check" />
          <span>Save summary</span>
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          <span>Cancel</span>
        </Button>
      </div>
    </div>
  );
}

export function SummaryPanel({
  recording,
  summary,
}: {
  readonly recording: Recording;
  readonly summary: RecordingSummary;
}) {
  const [paragraphs, setParagraphs] = useState<readonly string[]>(summary.paragraphs);
  const [actions, setActions] = useState<readonly ActionItem[]>(summary.actions);
  const [generated, setGenerated] = useState(() => generatedLabel(recording));
  const [editing, setEditing] = useState(false);
  const { busy, run } = useBusyTimer();
  const regenerating = busy.has("regen");
  const open = actions.filter((item) => !item.done).length;

  const regenerate = () =>
    run("regen", 1800, () => {
      setParagraphs(summary.paragraphs);
      setGenerated("Regenerated just now from the full transcript");
      toast.add({ title: "Summary regenerated", type: "success" });
    });

  const toggle = (index: number, done: boolean) => {
    setActions((current) => current.map((item, i) => (i === index ? { ...item, done } : item)));
    toast.add({ title: done ? "Marked done" : "Reopened", type: "success" });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-s2">
        <div className="grid gap-s2">
          <h2 id="tab-h">Summary</h2>
          <span className="text-sm text-muted-foreground">{generated}</span>
        </div>
        <div className="flex flex-wrap items-center gap-s2">
          <Button
            variant="secondary"
            size="sm"
            disabled={editing || regenerating}
            onClick={() => setEditing(true)}
          >
            <KmIcon name="edit" className="size-4" />
            <span>Edit</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={editing || regenerating}
            aria-busy={regenerating}
            onClick={regenerate}
          >
            {regenerating ? (
              <BusyLabel label="Regenerating…" />
            ) : (
              <>
                <KmIcon name="refresh" className="size-4" />
                <span>Regenerate summary</span>
              </>
            )}
          </Button>
        </div>
      </div>
      {editing ? (
        <SummaryEditor
          initial={paragraphs}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            setParagraphs(next);
            setGenerated("Edited by you just now");
            setEditing(false);
            toast.add({ title: "Summary saved", type: "success" });
          }}
        />
      ) : (
        <div
          className={cn("grid gap-s4 transition-opacity", regenerating && "opacity-50")}
          aria-busy={regenerating}
        >
          <div className={cn(panelClass, "max-w-[68ch] gap-0 [&>p+p]:mt-s3")}>
            {paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <section aria-labelledby="dec-h" className={panelClass}>
            <h3 id="dec-h">Decisions</h3>
            <ul className="m-0 grid list-none gap-s2 pl-5">
              {summary.decisions.map((decision) => (
                <li key={decision}>{decision}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="act-h" className={panelClass}>
            <div className="flex flex-wrap items-center justify-between gap-s2">
              <h3 id="act-h">Action items</h3>
              <span className="text-sm text-muted-foreground">
                {open} open of {actions.length}
              </span>
            </div>
            <div>
              {actions.map((item, index) => (
                <ActionRow
                  key={item.text}
                  item={item}
                  index={index}
                  onToggle={(done) => toggle(index, done)}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
