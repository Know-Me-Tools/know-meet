// TJ-ARCH-MOB-001 compliant
// settings.html `#account`: profile (display name, read-only email), meeting
// defaults (time zone and four switches), session (sign out) and account
// deletion behind a confirmation. Static: saves resolve locally with a toast.
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@know-meet/ui/components/alert-dialog";
import { Avatar, AvatarFallback } from "@know-meet/ui/components/avatar";
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { toast } from "@know-meet/ui/components/toast";
import { useState } from "react";
import type { SessionUserView } from "../../shared/session";
import { FALLBACK_TIME_ZONE, MEETING_DEFAULTS, TIME_ZONES } from "../application/settings-fixtures";
import { type FieldRule, validateDisplayName } from "../application/validators";
import { SelectField, SwitchRow, TextField } from "./settings-fields";
import { BusyContent, FieldRow, FormFoot, Panel, RequiredNote, Stack } from "./settings-parts";
import { SettingsHead } from "./settings-shell";
import { useFormErrors } from "./use-form-errors";
import { useSignOut } from "../../shared/session";
import { useBusyAction } from "./use-static-delay";

const PROFILE_RULES: Readonly<Record<"name", FieldRule>> = {
  name: { label: "Display name", required: true, validate: validateDisplayName },
};

function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

const zoneLabel = (zone: string) => zone.replace(/_/g, " ");

function ProfilePanel({ user }: { readonly user: SessionUserView }) {
  const [name, setName] = useState(user.name);
  const { formRef, errors, validate, revalidate } = useFormErrors(PROFILE_RULES);
  const save = useBusyAction();
  return (
    <Panel title="Profile">
      <form
        ref={formRef}
        noValidate
        className="grid gap-s4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!validate({ name })) return;
          save.start(700, () => toast.add({ title: "Profile saved", type: "success" }));
        }}
      >
        <div className="flex items-center gap-s4">
          <Avatar size="lg" tone="ember" aria-hidden="true">
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 gap-s2">
            <b className="truncate" title={user.name}>
              {user.name}
            </b>
            <span className="truncate text-sm text-muted-foreground" title={user.email}>
              {user.email}
            </span>
          </div>
        </div>
        <FieldRow>
          <TextField
            id="account-name"
            label="Display name"
            required
            maxLength={80}
            autoComplete="name"
            hint="Shown to participants and in invites you send."
            value={name}
            error={errors.name}
            onValueChange={(value) => {
              setName(value);
              revalidate("name", value);
            }}
          />
          <TextField
            id="account-email"
            label="Email"
            readOnly
            value={user.email}
            hint="Your sign-in identity. To use a different email, sign out and sign in with it."
          />
        </FieldRow>
        <FormFoot>
          <Button type="submit" disabled={save.busy} aria-busy={save.busy || undefined}>
            <BusyContent busy={save.busy} busyLabel="Saving…" icon="check">
              Save profile
            </BusyContent>
          </Button>
          <RequiredNote />
        </FormFoot>
      </form>
    </Panel>
  );
}

function MeetingDefaultsPanel() {
  const [zone, setZone] = useState(detectTimeZone);
  const [defaults, setDefaults] = useState<Readonly<Record<keyof typeof MEETING_DEFAULTS, boolean>>>(MEETING_DEFAULTS);
  const zones = TIME_ZONES.includes(zone) ? TIME_ZONES : [zone, ...TIME_ZONES];
  const toggle = (key: keyof typeof MEETING_DEFAULTS) => (checked: boolean) => {
    setDefaults((current) => ({ ...current, [key]: checked }));
    toast.add({ title: "Saved", type: "success" });
  };
  return (
    <Panel title="Meeting defaults" description="Applied when you start or schedule a meeting. You can change them per meeting.">
      <Stack>
        <SelectField
          label="Time zone"
          value={zone}
          hint="Used for scheduling, invites and the dates in summaries."
          options={zones.map((z) => [z, zoneLabel(z)] as const)}
          onValueChange={(next) => {
            setZone(next);
            toast.add({ title: `Time zone set to ${zoneLabel(next)}`, type: "success" });
          }}
        />
        <div>
          <SwitchRow label="Waiting room" description="Invitees wait until you admit them." checked={defaults.waiting} onCheckedChange={toggle("waiting")} />
          <SwitchRow label="Add Scribe to meetings I host" description="Scribe keeps notes, decisions and action items." checked={defaults.scribe} onCheckedChange={toggle("scribe")} />
          <SwitchRow label="Bring Iris, your dot" description="Your always-on agent joins with your private memory." checked={defaults.dot} onCheckedChange={toggle("dot")} />
          <SwitchRow label="Include phone dial-in in invites" description="Adds the dial-in number and meeting PIN to email and SMS invites." checked={defaults.dialin} onCheckedChange={toggle("dialin")} />
        </div>
      </Stack>
    </Panel>
  );
}

function DeleteAccountPanel({ onDeleted }: { readonly onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const remove = useBusyAction();
  return (
    <Panel title="Delete account" description="Removes your account and everything KnowMe stores for it. This can’t be undone.">
      <div>
        <Button variant="destructive" disabled={remove.busy} aria-busy={remove.busy || undefined} onClick={() => setOpen(true)}>
          <BusyContent busy={remove.busy} busyLabel="Deleting…" icon="trash">
            Delete account
          </BusyContent>
        </Button>
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription render={<div className="grid gap-s2" />}>
              <p>
                This permanently deletes your profile, settings, saved transcripts and summaries, and recordings in KnowMe-managed storage. Your dots’ private memory is erased.
              </p>
              <p>Files in your own bucket are not touched. Recordings are unpinned from IPFS, but copies other nodes already fetched may persist.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                setOpen(false);
                remove.start(1200, () => {
                  toast.add({ title: "Account deleted", type: "success" });
                  onDeleted();
                });
              }}
            >
              Delete account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

export function AccountSection({ user }: { readonly user: SessionUserView }) {
  const signOut = useSignOut();
  return (
    <>
      <SettingsHead section="account" title="Account" description="Your profile, time zone, and the defaults new meetings start with." />
      <ProfilePanel user={user} />
      <MeetingDefaultsPanel />
      <Panel title="Session" description="Signing out keeps your recordings and settings in your account.">
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              signOut();
              toast.add({ title: "Signed out", type: "success" });
            }}
          >
            <KmIcon name="log-out" />
            <span>Sign out</span>
          </Button>
        </div>
      </Panel>
      <DeleteAccountPanel onDeleted={signOut} />
    </>
  );
}
