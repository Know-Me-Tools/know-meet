// TJ-ARCH-MOB-001 compliant
// #dot:iris (agents.html `renderDot`): Iris's head, the pause switch, settings
// (name, voice, join, speak, memory scope) and recent meeting memories, each of
// which can be forgotten after a confirmation. Saving is simulated (static UI).
import { Button } from "@know-meet/ui/components/button";
import { cardVariants } from "@know-meet/ui/components/card";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@know-meet/ui/components/empty";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Orb } from "@know-meet/ui/components/orb";
import { toast } from "@know-meet/ui/components/toast";
import { cn } from "@know-meet/ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useDocumentTitle } from "../../shared/use-document-title";
import { formatDate, formatDay } from "../../workspace/application/format";
import { MEMORIES, VOICES } from "../application/agents-fixtures";
import type { IrisSettings } from "../domain/agent-config";
import { CheckGroup, ChoiceGroup, SelectField, SwitchRow, TextField } from "./agent-form-fields";
import { useAgentsState } from "./agents-state";
import { Crumbs, DotStatusChip, SectionHead } from "./agents-ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useStepForm } from "./use-step-form";

const SAVE_MS = 700;

function validateName(value: string): string {
  const v = value.trim();
  if (v === "") return "Give your dot a name — people see it in meetings.";
  return v.length > 24 ? "Keep it to 24 characters or fewer." : "";
}

type IrisForm = Pick<IrisSettings, "name" | "voice" | "join" | "speak" | "scope">;

function IrisSettingsForm() {
  const { iris, updateIris } = useAgentsState();
  const [form, setForm] = useState<IrisForm>(() => ({
    name: iris.name,
    voice: iris.voice,
    join: iris.join,
    speak: iris.speak,
    scope: iris.scope,
  }));
  const [saving, setSaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const validation = useStepForm<"name">((_, value) => validateName(value));

  return (
    <form
      ref={validation.formRef}
      aria-labelledby="iris-set"
      noValidate
      className={cardVariants({ variant: "panel" })}
      onSubmit={(event) => {
        event.preventDefault();
        if (!validation.submit({ name: form.name })) return;
        setSaving(true);
        timer.current = window.setTimeout(() => {
          const name = form.name.trim();
          updateIris({ ...form, name });
          setSaving(false);
          toast.add({ title: `${name}’s settings saved`, type: "success" });
        }, SAVE_MS);
      }}
    >
      <h2 id="iris-set" className="text-xl">
        Settings
      </h2>
      <div className="grid grid-cols-2 gap-s4 max-bp768:grid-cols-[minmax(0,1fr)]">
        <TextField
          id="iris-name"
          label="Name"
          required
          error={validation.errorOf("name")}
          control={{
            value: form.name,
            onValueChange: (name) => {
              setForm((current) => ({ ...current, name }));
              validation.recheck("name", name);
            },
            maxLength: 24,
          }}
        />
        <SelectField
          id="iris-voice"
          label="Voice"
          value={form.voice}
          options={VOICES}
          onValueChange={(voice) => setForm((current) => ({ ...current, voice }))}
        />
      </div>
      <ChoiceGroup
        name="iris-join"
        legend="Join behavior"
        surface="card"
        value={form.join}
        options={{
          always: { label: "Always join my meetings", desc: "Joins as soon as a meeting you’re in starts." },
          ask: { label: "Ask me first", desc: "Asks in the lobby before each meeting." },
        }}
        onValueChange={(join) => setForm((current) => ({ ...current, join }))}
      />
      <ChoiceGroup
        name="iris-speak"
        legend="Speak in meetings"
        surface="card"
        value={form.speak}
        options={{
          asked: { label: "Only when asked", desc: "Speaks when you or someone addresses it by name." },
          never: { label: "Never", desc: "Listens and remembers for you, but stays silent." },
        }}
        onValueChange={(speak) => setForm((current) => ({ ...current, speak }))}
      />
      <CheckGroup
        legend="What it may remember"
        hint="Memory is private to you. Nothing is shared with other participants or their dots."
        surface="card"
        value={form.scope}
        options={{
          summaries: { label: "Transcript summaries", desc: "Decisions and action items from meetings it attends." },
          conversations: { label: "My private agent conversations", desc: "What you ask it directly, in or out of meetings." },
          files: { label: "Files I upload", desc: "Documents you add to its memory yourself." },
        }}
        onToggle={(key, checked) => setForm((current) => ({ ...current, scope: { ...current.scope, [key]: checked } }))}
      />
      <div className="flex flex-wrap items-center gap-s2">
        <Button type="submit" disabled={saving} aria-busy={saving || undefined}>
          <KmIcon name={saving ? "refresh" : "check"} className="size-4" />
          <span>{saving ? "Saving…" : "Save settings"}</span>
        </Button>
      </div>
    </form>
  );
}

function MemoryList() {
  const { iris, forgotten, forgetMemory } = useAgentsState();
  const memories = MEMORIES.filter((memory) => !forgotten.has(memory.id));
  return (
    <section aria-labelledby="iris-mem" className={cardVariants({ variant: "panel" })}>
      <SectionHead
        id="iris-mem"
        title="Recent meeting memories"
        sub={`${memories.length} ${memories.length === 1 ? "memory" : "memories"}`}
      />
      {memories.length === 0 ? (
        <Empty>
          <EmptyMedia variant="icon">
            <KmIcon name="book" />
          </EmptyMedia>
          <EmptyTitle>No meeting memories</EmptyTitle>
          <EmptyDescription>
            {`${iris.name} will add memories from the next meeting it attends, within the scope you set.`}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="grid gap-s2">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s3 rounded-base bg-surface px-s4 py-s3 shadow-(--shadow-card) max-bp768:grid-cols-[auto_minmax(0,1fr)]"
            >
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-10 bg-muted text-foreground">
                <KmIcon name="book" />
              </span>
              <div className="grid min-w-0 gap-0.5">
                <span className="block truncate font-semibold" title={memory.meeting}>
                  {memory.meeting}
                </span>
                <span className="block text-sm text-muted-foreground">{formatDate(memory.date)}</span>
                <p className="text-sm text-foreground [overflow-wrap:anywhere]">{memory.text}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-s2 max-bp768:col-span-full max-bp768:justify-start">
                <ConfirmDialog
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Forget memory from ${memory.meeting}, ${formatDay(memory.date)}`}
                    >
                      <KmIcon name="trash" className="size-4" />
                      <span>Forget</span>
                    </Button>
                  }
                  title="Forget this memory?"
                  confirmLabel="Forget"
                  onConfirm={() => {
                    forgetMemory(memory.id);
                    toast.add({ title: "Memory forgotten" });
                  }}
                >
                  <p>{`“${memory.text}”`}</p>
                  <p>{`${iris.name} will permanently forget this. It can’t be restored.`}</p>
                </ConfirmDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function DotView() {
  const { iris, updateIris } = useAgentsState();
  useDocumentTitle(`${iris.name} — Know Meet`);
  return (
    <>
      <header className="mb-s5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-s5">
        <span data-state={iris.paused ? "paused" : "listening"} className="w-[72px] max-bp768:w-14">
          <Orb className={cn("w-full", iris.paused && "animate-none opacity-45 grayscale")} />
        </span>
        <div className="grid min-w-0 gap-s2">
          <Crumbs items={[{ label: "Agents", to: "registry" }, { label: "Dots", to: "dots" }, { label: iris.name }]} />
          <h1 tabIndex={-1} className="block truncate text-2xl font-bold outline-none" title={iris.name}>
            {iris.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-s4 gap-y-s2 text-sm text-muted-foreground">
            <DotStatusChip paused={iris.paused} />
            <span>Your dot · private memory</span>
          </div>
        </div>
      </header>
      <div className={cn(cardVariants({ variant: "panel" }), "mb-s5")}>
        <SwitchRow
          id="iris-pause"
          label={`Pause ${iris.name}`}
          desc={`While paused, ${iris.name} won’t join meetings or add new memories. Existing memory is kept.`}
          checked={iris.paused}
          onCheckedChange={(paused) => {
            updateIris({ paused });
            toast.add({ title: paused ? `${iris.name} paused` : `${iris.name} resumed`, type: "success" });
          }}
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-s5 max-bp1024:grid-cols-[minmax(0,1fr)]">
        <IrisSettingsForm />
        <MemoryList />
      </div>
    </>
  );
}
