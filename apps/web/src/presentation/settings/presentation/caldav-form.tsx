// TJ-ARCH-MOB-001 compliant
// settings.html `vCaldav`: server URL, username and app-specific password, then
// "Test & connect" (static). The password "wrong" simulates a rejection: the
// field error and a cause-then-fix note (HTTP 401 only as secondary detail, F9).
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { type FieldRule, validateCalDavServer } from "../application/validators";
import { FieldRow, BusyContent, FormFoot, Note, Panel, RequiredNote } from "./settings-parts";
import { TextField } from "./settings-fields";
import { SettingsHead } from "./settings-shell";
import { useFormErrors } from "./use-form-errors";
import { useBusyAction } from "./use-static-delay";
import { SettingsLink } from "./settings-link";

type CalDavKey = "server" | "user" | "password";

const RULES: Readonly<Record<CalDavKey, FieldRule>> = {
  server: { label: "Server URL", required: true, validate: validateCalDavServer },
  user: { label: "Username", required: true },
  password: { label: "App-specific password", required: true },
};

export function CalDavSection() {
  const [values, setValues] = useState<Readonly<Record<CalDavKey, string>>>({ server: "https://caldav.icloud.com", user: "", password: "" });
  const [rejected, setRejected] = useState(false);
  const { formRef, errors, validate, revalidate, setError } = useFormErrors(RULES);
  const testing = useBusyAction();
  const navigate = useNavigate();
  const set = (key: CalDavKey) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    revalidate(key, value);
  };
  return (
    <>
      <SettingsHead
        section="calendar-connect"
        title="Connect iCloud / CalDAV"
        description="Works with iCloud, Fastmail, Nextcloud and other CalDAV servers."
        parent={["Calendars", "calendars"]}
      />
      <Panel title="Account details">
        <form
          ref={formRef}
          noValidate
          className="grid gap-s4"
          onSubmit={(event) => {
            event.preventDefault();
            setRejected(false);
            if (!validate(values)) return;
            testing.start(1500, () => {
              if (values.password.trim() === "wrong") {
                setRejected(true);
                setError("password", "This password was rejected. Generate a new app-specific password and paste it here.");
                return;
              }
              toast.add({ title: "iCloud / CalDAV connected", type: "success" });
              void navigate({ to: "/settings", hash: "calendars" });
            });
          }}
        >
          <TextField id="caldav-server" label="Server URL" required mono hint="For iCloud use https://caldav.icloud.com." value={values.server} error={errors.server} onValueChange={set("server")} />
          <FieldRow>
            <TextField id="caldav-user" label="Username" required autoComplete="username" placeholder="you@icloud.com" hint="For iCloud, your Apple Account email." value={values.user} error={errors.user} onValueChange={set("user")} />
            <TextField
              id="caldav-pass"
              label="App-specific password"
              kind="password"
              required
              mono
              placeholder="xxxx-xxxx-xxxx-xxxx"
              hint="Create one at appleid.apple.com → Sign-In and Security → App-Specific Passwords. Your regular password won’t work."
              value={values.password}
              error={errors.password}
              onValueChange={set("password")}
            />
          </FieldRow>
          <div aria-live="polite">
            {rejected ? (
              <Note kind="err" icon="alert">
                <p>
                  <b>Sign-in was rejected. </b>The server didn’t accept this username and password. Check the username, then create a new app-specific password — they stop working if you change your account password.
                </p>
                <p>Server response: HTTP 401</p>
              </Note>
            ) : null}
          </div>
          <FormFoot>
            <Button type="submit" disabled={testing.busy} aria-busy={testing.busy || undefined}>
              <BusyContent busy={testing.busy} busyLabel="Testing…" icon="link">
                Test &amp; connect
              </BusyContent>
            </Button>
            <SettingsLink hash="calendars" className={cn(buttonVariants({ variant: "ghost" }), focusFillClass)}>
              Cancel
            </SettingsLink>
            <RequiredNote />
          </FormFoot>
        </form>
      </Panel>
    </>
  );
}
