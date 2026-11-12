// TJ-ARCH-MOB-001 compliant
// settings.html `#telnyx-sms` connect form: paste and validate the API key, then
// pick a messaging profile and sender number (loaded after validation), keep
// delivery receipts, copy the webhook URL, optionally send a test, and connect.
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { toast } from "@know-meet/ui/components/toast";
import { useState } from "react";
import { MESSAGING_PROFILES, MESSAGING_WEBHOOK } from "../application/settings-fixtures";
import { type FieldRule, validateTelnyxKey } from "../application/validators";
import { InputGroup, SelectField, SwitchRow, TextField } from "./settings-fields";
import { BusyContent, FieldRow, FormFoot, Note, Panel, RequiredNote, Stack } from "./settings-parts";
import { SmsTester, type SmsTestResult } from "./sms-tester";
import { useFormErrors } from "./use-form-errors";
import { useBusyAction, useLater } from "./use-static-delay";

export interface SmsConnection {
  readonly keyLast4: string;
  readonly profile: string;
  readonly number: string;
  readonly receipts: boolean;
  readonly lastTest: SmsTestResult | null;
}

const KEY_RULES: Readonly<Record<"key", FieldRule>> = {
  key: { label: "Telnyx API key", required: true, validate: validateTelnyxKey },
};

type KeyState = "unchecked" | "loading" | "valid";

function ProfilePickers({ keyState, profile, number, onProfile, onNumber }: {
  readonly keyState: KeyState;
  readonly profile: string;
  readonly number: string;
  readonly onProfile: (value: string) => void;
  readonly onNumber: (value: string) => void;
}) {
  if (keyState === "unchecked") {
    return (
      <Stack>
        <SelectField label="Messaging profile" required disabled value="" options={[["", "Validate your API key first"]]} hint="Available after the key is validated." />
        <SelectField label="Sender number" required disabled value="" options={[["", "Choose a profile first"]]} />
      </Stack>
    );
  }
  if (keyState === "loading") {
    return (
      <div className="grid gap-1.5">
        <span className="text-sm font-semibold">Messaging profile</span>
        <p role="status" className="flex items-center gap-s2 text-sm text-muted-foreground">
          <KmIcon name="refresh" className="animate-spin [animation-duration:var(--anim-spin)] motion-reduce:animate-none" />
          <span>Loading messaging profiles from Telnyx…</span>
        </p>
      </div>
    );
  }
  const numbers = profile === "" ? [] : (MESSAGING_PROFILES[profile] ?? []);
  return (
    <FieldRow>
      <SelectField
        label="Messaging profile"
        required
        value={profile}
        options={[["", "Select a profile"], ...Object.keys(MESSAGING_PROFILES).map((p) => [p, p] as const)]}
        onValueChange={onProfile}
      />
      <SelectField
        label="Sender number"
        required
        disabled={profile === ""}
        value={number}
        hint={profile === "" ? "Choose a profile first." : `${numbers.length} ${numbers.length === 1 ? "number" : "numbers"} on this profile.`}
        options={[["", profile === "" ? "Choose a profile first" : "Select a number"], ...numbers.map((n) => [n, n] as const)]}
        onValueChange={onNumber}
      />
    </FieldRow>
  );
}

export function SmsConnectForm({ onConnected, onCancel }: {
  readonly onConnected: (connection: SmsConnection) => void;
  readonly onCancel: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [keyState, setKeyState] = useState<KeyState>("unchecked");
  const [profile, setProfile] = useState("");
  const [number, setNumber] = useState("");
  const [receipts, setReceipts] = useState(true);
  const [lastTest, setLastTest] = useState<SmsTestResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { formRef, errors, validate, revalidate } = useFormErrors(KEY_RULES);
  const validating = useBusyAction();
  const connecting = useBusyAction();
  const later = useLater();

  return (
    <Panel title="Connect Telnyx Messaging" description="Your key is stored encrypted on KnowMe servers and only used to send messages.">
      <form
        ref={formRef}
        noValidate
        className="grid gap-s4"
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          if (!validate({ key: apiKey })) return;
          if (keyState !== "valid") {
            setFormError("Validate your API key before connecting.");
            return;
          }
          if (profile === "" || number === "") {
            setFormError("Choose a messaging profile and a sender number to send from.");
            return;
          }
          connecting.start(900, () => {
            toast.add({ title: "Telnyx SMS connected", type: "success" });
            onConnected({ keyLast4: apiKey.trim().slice(-4), profile, number, receipts, lastTest });
          });
        }}
      >
        <InputGroup className="items-end">
          <TextField
            id="sms-key"
            label="Telnyx API key"
            kind="password"
            required
            mono
            hint="From Mission Control → Account settings → API Keys. Use a v2 key that starts with KEY."
            value={apiKey}
            error={errors.key}
            onValueChange={(value) => {
              setApiKey(value);
              revalidate("key", value);
              if (keyState !== "unchecked") setKeyState("unchecked");
            }}
          />
          <Button
            variant="secondary"
            disabled={validating.busy}
            aria-busy={validating.busy || undefined}
            onClick={() => {
              if (!validate({ key: apiKey })) return;
              validating.start(1100, () => {
                toast.add({ title: "API key is valid", type: "success" });
                setKeyState("loading");
                later(900, () => setKeyState("valid"));
              });
            }}
          >
            <BusyContent busy={validating.busy} busyLabel="Validating…" icon="key">
              Validate key
            </BusyContent>
          </Button>
        </InputGroup>
        <ProfilePickers
          keyState={keyState}
          profile={profile}
          number={number}
          onProfile={(value) => {
            setProfile(value);
            setNumber("");
          }}
          onNumber={setNumber}
        />
        <Stack gap="sm">
          <SwitchRow
            label="Send delivery receipts to KnowMe"
            description="Telnyx posts delivery status to this webhook so you can see Delivered or Failed per participant."
            checked={receipts}
            onCheckedChange={setReceipts}
          />
          <TextField id="sms-webhook" label="Webhook URL" readOnly mono copyable value={MESSAGING_WEBHOOK} hint="Set this as the webhook URL on the messaging profile in Telnyx." />
        </Stack>
        {profile !== "" && number !== "" ? (
          <Stack gap="sm">
            <h3 className="text-base">Test SMS</h3>
            <SmsTester idPrefix="connect" onResult={setLastTest} />
          </Stack>
        ) : null}
        <div aria-live="polite">
          {formError === null ? null : (
            <Note kind="err" icon="alert">
              {formError}
            </Note>
          )}
        </div>
        <FormFoot>
          <Button type="submit" disabled={connecting.busy} aria-busy={connecting.busy || undefined}>
            <BusyContent busy={connecting.busy} busyLabel="Connecting…" icon="check">
              Save and connect
            </BusyContent>
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <RequiredNote />
        </FormFoot>
      </form>
    </Panel>
  );
}
