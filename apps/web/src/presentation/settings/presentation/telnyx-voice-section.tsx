// TJ-ARCH-MOB-001 compliant
// settings.html `#telnyx-voice`: inbound-only note, the dial-in numbers table
// (a named scroll region when it overflows, RV-21), add/release numbers, the SIP
// trunk form, the end-to-end status checks and the test-call steps.
import { Button } from "@know-meet/ui/components/button";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { TableRegion } from "@know-meet/ui/components/table-region";
import { toast } from "@know-meet/ui/components/toast";
import { useMemo, useState } from "react";
import { copyText } from "../../shared/copy-text";
import type { Workspace } from "../../workspace/domain/workspace";
import { DEFAULT_GREETING, dialInNumbersFrom, LIVEKIT_TRUNK_ID } from "../application/settings-fixtures";
import { type FieldRule, validateSipName } from "../application/validators";
import type { CheckRowState, CheckStep, DialInNumber } from "../domain/settings";
import { AddNumberDialog } from "./add-number-dialog";
import { ChecksList } from "./checks-list";
import { ConfirmDialog, type ConfirmRequest } from "./confirm-dialog";
import { InputGroup, SelectField, TextField } from "./settings-fields";
import { BusyContent, FieldRow, FormFoot, KeyValue, KeyValueList, Note, Panel, RequiredNote, Stack, StatusChip } from "./settings-parts";
import { SettingsHead } from "./settings-shell";
import { useFormErrors } from "./use-form-errors";
import { useStagedChecks } from "./use-staged-checks";
import { useBusyAction, useLater } from "./use-static-delay";

function NumbersPanel({ numbers, onAdd, onRelease }: {
  readonly numbers: readonly DialInNumber[];
  readonly onAdd: () => void;
  readonly onRelease: (number: string) => void;
}) {
  return (
    <Panel title="Dial-in numbers" description="Shown in invites alongside the meeting PIN.">
      <TableRegion caption="Dial-in numbers" wrapperClassName="bg-bg-2">
        <thead>
          <tr>
            <th scope="col">Number</th>
            <th scope="col">Region</th>
            <th scope="col">Status</th>
            <th scope="col">Routes to</th>
            <th scope="col" className="text-right!">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {numbers.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-muted-foreground">
                No dial-in numbers. Add one so invites include a phone option.
              </td>
            </tr>
          ) : (
            numbers.map((n) => (
              <tr key={n.number}>
                <td>
                  <span className="font-mono text-13 whitespace-nowrap">{n.number}</span>
                </td>
                <td>{n.region}</td>
                <td>
                  {n.status === "Active" ? (
                    <StatusChip tone="green">Active</StatusChip>
                  ) : (
                    <StatusChip tone="amber">Provisioning</StatusChip>
                  )}
                </td>
                <td className="text-sm text-muted-foreground">LiveKit SIP · PIN dispatch</td>
                <td className="text-right! tabular-nums">
                  <Button variant="ghost" size="sm" aria-label={`Release ${n.number}`} disabled={n.status !== "Active"} onClick={() => onRelease(n.number)}>
                    Release
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </TableRegion>
      <div>
        <Button size="sm" onClick={onAdd}>
          <KmIcon name="plus" className="size-4" />
          <span>Add number</span>
        </Button>
      </div>
    </Panel>
  );
}

type SipKey = "sipName" | "greeting";

const SIP_RULES: Readonly<Record<SipKey, FieldRule>> = {
  sipName: { label: "Telnyx SIP connection name", required: true, validate: validateSipName },
  greeting: { label: "Greeting", required: true },
};

function SipTrunkPanel({ initialSipName }: { readonly initialSipName: string }) {
  const [values, setValues] = useState<Readonly<Record<SipKey, string>>>({ sipName: initialSipName, greeting: DEFAULT_GREETING });
  const [pinLength, setPinLength] = useState("8");
  const { formRef, errors, validate, revalidate } = useFormErrors(SIP_RULES);
  const saving = useBusyAction();
  const set = (key: SipKey) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    revalidate(key, value);
  };
  return (
    <Panel title="SIP trunk to LiveKit" description="Calls arrive on a Telnyx SIP connection and are handed to a LiveKit inbound trunk.">
      <form
        ref={formRef}
        noValidate
        className="grid gap-s4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!validate(values)) return;
          saving.start(700, () => toast.add({ title: "Dial-in settings saved", type: "success" }));
        }}
      >
        <FieldRow>
          <TextField id="voice-sip" label="Telnyx SIP connection name" required mono hint="The SIP connection in Telnyx that your numbers are assigned to." value={values.sipName} error={errors.sipName} onValueChange={set("sipName")} />
          <div className="grid min-w-0 gap-1.5">
            <span className="text-sm font-semibold">LiveKit inbound trunk ID</span>
            <p className="text-sm text-muted-foreground">Created by KnowMe on your LiveKit project (sample ID).</p>
            <InputGroup>
              <Input readOnly aria-label="LiveKit inbound trunk ID" value={LIVEKIT_TRUNK_ID} className="font-mono text-13" />
              <Button variant="ghost" size="icon" aria-label="Copy trunk ID" onClick={() => void copyText(LIVEKIT_TRUNK_ID)}>
                <KmIcon name="copy" />
              </Button>
            </InputGroup>
          </div>
        </FieldRow>
        <KeyValueList>
          <KeyValue label="Dispatch rule" plain="plain">
            <b>PIN-based. </b>The caller enters the meeting PIN and is routed to that meeting’s LiveKit room as a phone participant.
          </KeyValue>
          <KeyValue label="Wrong PIN" plain="plain">
            Callers get three tries, then the call ends.
          </KeyValue>
        </KeyValueList>
        <SelectField
          label="Meeting PIN length"
          value={pinLength}
          options={[["6", "6 digits"], ["8", "8 digits"], ["10", "10 digits"]]}
          hint="Longer PINs are harder to guess. Applies to meetings scheduled from now on."
          onValueChange={setPinLength}
        />
        <Stack gap="sm">
          <TextField id="voice-greeting" label="Greeting" kind="textarea" required maxLength={200} rows={3} hint="Read to callers before they enter the PIN." value={values.greeting} error={errors.greeting} onValueChange={set("greeting")} />
          <span className="text-xs text-muted-foreground">{values.greeting.length} / 200</span>
        </Stack>
        <FormFoot>
          <Button type="submit" disabled={saving.busy} aria-busy={saving.busy || undefined}>
            <BusyContent busy={saving.busy} busyLabel="Saving…" icon="check">
              Save dial-in settings
            </BusyContent>
          </Button>
          <RequiredNote />
        </FormFoot>
      </form>
    </Panel>
  );
}

function StatusPanel({ activeCount, sipName }: { readonly activeCount: number; readonly sipName: string }) {
  const steps = useMemo<readonly CheckStep[]>(
    () => [
      { label: "Telnyx number", detail: `${activeCount} active dial-in numbers`, initial: "Active", okText: "Active" },
      { label: "SIP connection", detail: sipName, initial: "Active", okText: "Active" },
      { label: "LiveKit inbound trunk", detail: `${LIVEKIT_TRUNK_ID} (sample)`, initial: "Active", okText: "Active" },
      { label: "Dispatch rule", detail: "PIN → meeting room", initial: "Active", okText: "Active" },
    ],
    [activeCount, sipName],
  );
  const preset = useMemo<readonly CheckRowState[]>(() => steps.map((s) => ({ state: "ok", text: "Active", detail: s.detail })), [steps]);
  const checks = useStagedChecks(steps, preset);
  const [running, setRunning] = useState(false);
  return (
    <Panel
      title="Status"
      description="Every hop from the phone network to the meeting room."
      trail={
        <Button
          variant="secondary"
          size="sm"
          disabled={running}
          aria-busy={running || undefined}
          onClick={() => {
            setRunning(true);
            checks.run(() => {
              setRunning(false);
              toast.add({ title: "Dial-in path is active end to end", type: "success" });
            });
          }}
        >
          <BusyContent busy={running} busyLabel="Checking…" icon="refresh">
            Re-check
          </BusyContent>
        </Button>
      }
    >
      <ChecksList steps={steps} rows={checks.rows} label="Dial-in path" />
    </Panel>
  );
}

export function TelnyxVoiceSection({ workspace }: { readonly workspace: Workspace }) {
  const [numbers, setNumbers] = useState<readonly DialInNumber[]>(() => dialInNumbersFrom(workspace.telnyx.dialIn));
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const later = useLater();
  const first = numbers[0]?.number ?? workspace.telnyx.dialIn[0]?.number ?? "";
  return (
    <>
      <SettingsHead
        section="telnyx-voice"
        title="Telnyx voice dial-in"
        description="Let people join from any phone. Telnyx numbers route inbound calls over SIP into LiveKit, where the caller enters a meeting PIN."
      />
      <Note kind="info" icon="phone-in">
        <p>
          <b>Inbound only. </b>KnowMe never places outbound calls — there is no dial-out or “call a phone” feature. Callers dial in to your numbers.
        </p>
      </Note>
      <NumbersPanel
        numbers={numbers}
        onAdd={() => setAdding(true)}
        onRelease={(number) =>
          setConfirm({
            title: `Release ${number}?`,
            body: "Callers to this number will no longer reach your meetings, and the number returns to Telnyx. Invites already sent still show it.",
            confirmLabel: "Release number",
            tone: "danger",
            onConfirm: () => {
              setNumbers((current) => current.filter((n) => n.number !== number));
              toast.add({ title: "Number released", type: "success" });
            },
          })
        }
      />
      <SipTrunkPanel initialSipName={workspace.telnyx.sipTrunk} />
      <StatusPanel activeCount={numbers.filter((n) => n.status === "Active").length} sipName={workspace.telnyx.sipTrunk} />
      <Panel title="Test call">
        <ol className="m-0 grid list-decimal gap-s2 pl-5">
          <li>
            Start a meeting, then call <span className="font-mono text-13 whitespace-nowrap">{first}</span> from any phone.
          </li>
          <li>Listen for your greeting.</li>
          <li>
            Enter the meeting PIN shown in the room’s invite panel, followed by <code>#</code> — for example{" "}
            <span className="font-mono text-13 whitespace-nowrap">482 913 07#</span>.
          </li>
          <li>You join as a phone participant. Your speech is transcribed like everyone else’s.</li>
        </ol>
      </Panel>
      <AddNumberDialog
        open={adding}
        onOpenChange={setAdding}
        onAdd={(number) => {
          setNumbers((current) => [...current, { number, region: "US", status: "Provisioning" }]);
          toast.add({ title: `Provisioning ${number}…`, type: "info" });
          later(2600, () => {
            setNumbers((current) => current.map((n) => (n.number === number ? { ...n, status: "Active" } : n)));
            toast.add({ title: `${number} is active`, type: "success" });
          });
        }}
      />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
