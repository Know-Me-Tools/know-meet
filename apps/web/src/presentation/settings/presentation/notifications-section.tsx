// TJ-ARCH-MOB-001 compliant
// settings.html `#notifications`: email switches, then SMS (a mobile number
// field with Save, and SMS switches that stay disabled until a number is saved).
import { Button } from "@know-meet/ui/components/button";
import { toast } from "@know-meet/ui/components/toast";
import { useLayoutEffect, useRef, useState } from "react";
import { NOTIFICATION_DEFAULTS } from "../application/settings-fixtures";
import { checkField, validatePhone } from "../application/validators";
import { InputGroup, SwitchRow, TextField } from "./settings-fields";
import { Note, Panel, Stack } from "./settings-parts";
import { SettingsHead } from "./settings-shell";

type NotificationKey = keyof typeof NOTIFICATION_DEFAULTS;

const PHONE_RULE = { label: "Mobile number for SMS", validate: validatePhone } as const;

function SmsPanel({
  prefs,
  toggle,
}: {
  readonly prefs: Readonly<Record<NotificationKey, boolean>>;
  readonly toggle: (key: NotificationKey) => (checked: boolean) => void;
}) {
  const [phone, setPhone] = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const groupRef = useRef<HTMLDivElement>(null);
  // F6: a failed save moves focus to the invalid number field.
  useLayoutEffect(() => {
    if (attempt > 0) groupRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);
  const smsOn = savedPhone !== "";
  return (
    <Panel title="SMS" description="Sent through Telnyx. Standard message rates may apply.">
      <Stack>
        <div ref={groupRef}>
          <InputGroup className="items-end">
            <TextField
              id="notif-phone"
              label="Mobile number for SMS"
              kind="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+1 415 555 0142"
              hint="Include the country code. Reply STOP to any message to opt out."
              value={phone}
              error={error}
              onValueChange={(value) => {
                setPhone(value);
                if (error !== null && checkField(PHONE_RULE, value) === null) setError(null);
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                const message = checkField(PHONE_RULE, phone);
                setError(message);
                if (message !== null) {
                  setAttempt((n) => n + 1);
                  return;
                }
                const value = phone.trim();
                setSavedPhone(value);
                toast.add({
                  title: value === "" ? "Mobile number removed" : "Mobile number saved",
                  type: "success",
                });
              }}
            >
              Save number
            </Button>
          </InputGroup>
        </div>
        {smsOn ? null : (
          <Note kind="info" icon="info">
            Add a mobile number to turn on SMS notifications.
          </Note>
        )}
        <fieldset disabled={!smsOn} className="m-0 min-w-0 p-0 disabled:opacity-55">
          <legend className="sr-only">SMS notifications</legend>
          <SwitchRow
            label="Meeting starting"
            description="A text 5 minutes before meetings you host or were invited to."
            checked={prefs.smsStart}
            disabled={!smsOn}
            onCheckedChange={toggle("smsStart")}
          />
          <SwitchRow
            label="Summary link"
            description="A short link to the summary when a meeting closes."
            checked={prefs.smsSummary}
            disabled={!smsOn}
            onCheckedChange={toggle("smsSummary")}
          />
        </fieldset>
      </Stack>
    </Panel>
  );
}

export function NotificationsSection() {
  const [prefs, setPrefs] =
    useState<Readonly<Record<NotificationKey, boolean>>>(NOTIFICATION_DEFAULTS);
  const toggle = (key: NotificationKey) => (checked: boolean) => {
    setPrefs((current) => ({ ...current, [key]: checked }));
    toast.add({ title: "Saved", type: "success" });
  };
  return (
    <>
      <SettingsHead
        section="notifications"
        title="Notifications"
        description="Choose what KnowMe tells you about, and where."
      />
      <Panel title="Email">
        <div>
          <SwitchRow
            label="Recording ready"
            description="When a recording finishes processing and is pinned."
            checked={prefs.recReady}
            onCheckedChange={toggle("recReady")}
          />
          <SwitchRow
            label="Summary and transcript"
            description="Your own copy after each meeting you join."
            checked={prefs.summary}
            onCheckedChange={toggle("summary")}
          />
          <SwitchRow
            label="Invite responses"
            description="When invitees accept or decline."
            checked={prefs.responses}
            onCheckedChange={toggle("responses")}
          />
          <SwitchRow
            label="Weekly digest"
            description="Open action items assigned to you across meetings."
            checked={prefs.digest}
            onCheckedChange={toggle("digest")}
          />
        </div>
      </Panel>
      <SmsPanel prefs={prefs} toggle={toggle} />
    </>
  );
}
