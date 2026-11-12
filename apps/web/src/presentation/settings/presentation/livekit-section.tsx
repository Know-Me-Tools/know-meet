// TJ-ARCH-MOB-001 compliant
// settings.html `#livekit`: a connection-mode segment (KnowMe-managed or your own
// project). Managed shows the server URL and the credential env var NAMES (values
// never reach the browser); own shows the project form with a staged, local
// "Test connection" and a confirm when saving untested. No network.
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { toast } from "@know-meet/ui/components/toast";
import { useMemo, useState } from "react";
import type { Workspace } from "../../workspace/domain/workspace";
import { LIVEKIT_REGIONS } from "../application/settings-fixtures";
import { type FieldRule, validateLiveKitKey, validateLiveKitUrl } from "../application/validators";
import type { CheckStep, LiveKitMode } from "../domain/settings";
import { ChecksList } from "./checks-list";
import { ConfirmDialog, type ConfirmRequest } from "./confirm-dialog";
import { SegmentField, SelectField, TextField } from "./settings-fields";
import {
  BusyContent,
  CredentialRow,
  FieldRow,
  FormFoot,
  Note,
  Panel,
  RequiredNote,
  Stack,
  StatusChip,
} from "./settings-parts";
import { SettingsHead } from "./settings-shell";
import { useFormErrors } from "./use-form-errors";
import { useStagedChecks } from "./use-staged-checks";
import { useBusyAction } from "./use-static-delay";

type CapabilityState = "ok" | "pending";

function CapabilityRow({
  icon,
  title,
  description,
  state,
}: {
  readonly icon: "record" | "phone-in";
  readonly title: string;
  readonly description: string;
  readonly state: CapabilityState;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s3 py-s3 max-bp768:grid-cols-[auto_minmax(0,1fr)]">
      <span aria-hidden="true" className="grid size-10 place-items-center rounded-10 bg-muted">
        <KmIcon name={icon} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <span className="max-bp768:col-start-2 max-bp768:justify-self-start">
        {state === "ok" ? (
          <StatusChip tone="green">Available</StatusChip>
        ) : (
          <StatusChip tone="amber">Not checked yet</StatusChip>
        )}
      </span>
    </div>
  );
}

function CapabilitiesPanel({ state }: { readonly state: CapabilityState }) {
  return (
    <Panel title="Capabilities" description="What this connection supports for Know Meet.">
      <div>
        <CapabilityRow
          icon="record"
          title="Egress"
          description="Room Composite recording to MP4 or HLS on S3-compatible storage"
          state={state}
        />
        <CapabilityRow
          icon="phone-in"
          title="SIP"
          description="Inbound trunk for Telnyx voice dial-in (no outbound calling)"
          state={state}
        />
      </div>
    </Panel>
  );
}

function ManagedProject({ workspace }: { readonly workspace: Workspace }) {
  return (
    <>
      <Panel
        title="KnowMe-managed project"
        description="KnowMe runs and scales the LiveKit project for you."
      >
        <Stack>
          <TextField
            id="lk-managed-url"
            label="Server URL"
            readOnly
            mono
            copyable
            value={workspace.livekit.url}
          />
          <div className="grid gap-1.5">
            <span className="text-sm font-semibold">Credentials</span>
            <Stack gap="sm">
              <CredentialRow name={workspace.livekit.keyVar} />
              <CredentialRow name={workspace.livekit.secretVar} />
            </Stack>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <KmIcon name="lock" className="size-4" />
              <span>
                Managed by KnowMe — stored server-side. Values are never shown in the browser.
              </span>
            </p>
          </div>
        </Stack>
      </Panel>
      <CapabilitiesPanel state="ok" />
    </>
  );
}

type OwnKey = "url" | "key" | "secret";

const OWN_RULES: Readonly<Record<OwnKey, FieldRule>> = {
  url: { label: "Server URL", required: true, validate: validateLiveKitUrl },
  key: { label: "API key", required: true, validate: validateLiveKitKey },
  secret: { label: "API secret", required: true },
};

function OwnProject() {
  const [values, setValues] = useState<Readonly<Record<OwnKey, string>>>({
    url: "",
    key: "",
    secret: "",
  });
  const [region, setRegion] = useState("auto");
  const [tested, setTested] = useState(false);
  const [outcome, setOutcome] = useState<{
    readonly ok: boolean;
    readonly message: string;
    readonly step?: string;
  } | null>(null);
  const [showChecks, setShowChecks] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const { formRef, errors, validate, revalidate } = useFormErrors(OWN_RULES);
  const [testing, setTesting] = useState(false);
  const saving = useBusyAction();
  const steps = useMemo<readonly CheckStep[]>(
    () => [
      { label: "Resolve URL", detail: "DNS and TLS for the server URL" },
      {
        label: "Authenticate",
        detail: "Sign a server token with the API key and secret",
        fail: () =>
          values.secret.trim().length > 0 && values.secret.trim().length < 16
            ? "The API secret was rejected. Copy it again from your LiveKit project — secrets are long random strings."
            : null,
      },
      { label: "Create test room", detail: "Create and delete a temporary room" },
      { label: "Egress available", detail: "Room Composite egress can be started" },
      { label: "SIP available", detail: "Inbound SIP trunks can be created" },
    ],
    [values.secret],
  );
  const checks = useStagedChecks(steps);
  const set = (key: OwnKey) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    revalidate(key, value);
  };
  const commit = () =>
    saving.start(800, () => {
      setValues((current) => ({ ...current, secret: "" }));
      toast.add({ title: "Saved. New meetings use your LiveKit project", type: "success" });
    });

  return (
    <>
      <Panel
        title="Your LiveKit project"
        description="Use a LiveKit Cloud or self-hosted project you control."
      >
        <form
          ref={formRef}
          noValidate
          className="grid gap-s4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!validate(values)) return;
            if (tested) {
              commit();
              return;
            }
            setConfirm({
              title: "Save without a successful test?",
              body: "New meetings may fail to start if the URL or credentials are wrong. We recommend running Test connection first.",
              confirmLabel: "Save anyway",
              onConfirm: commit,
            });
          }}
        >
          <Stack>
            <TextField
              id="lk-url"
              label="Server URL"
              required
              mono
              placeholder="wss://your-project.livekit.cloud"
              hint="The WebSocket URL from your LiveKit project settings."
              value={values.url}
              error={errors.url}
              onValueChange={set("url")}
            />
            <FieldRow>
              <TextField
                id="lk-key"
                label="API key"
                required
                mono
                placeholder="APIxxxxxxxxxxxx"
                value={values.key}
                error={errors.key}
                onValueChange={set("key")}
              />
              <TextField
                id="lk-secret"
                label="API secret"
                kind="password"
                required
                mono
                hint="Stored encrypted on KnowMe servers and never shown again."
                value={values.secret}
                error={errors.secret}
                onValueChange={set("secret")}
              />
            </FieldRow>
            <SelectField
              label="Region"
              value={region}
              options={LIVEKIT_REGIONS}
              hint="Leave on Auto unless your project is pinned to a region."
              onValueChange={setRegion}
            />
          </Stack>
          <FormFoot>
            <Button
              variant="secondary"
              disabled={testing}
              aria-busy={testing || undefined}
              onClick={() => {
                if (!validate(values)) return;
                setShowChecks(true);
                setOutcome(null);
                setTesting(true);
                checks.run((result) => {
                  setTesting(false);
                  setTested(result.ok);
                  setOutcome(
                    result.ok
                      ? {
                          ok: true,
                          message:
                            "Connection works. Egress and SIP are available on this project. Save to use it for new meetings.",
                        }
                      : {
                          ok: false,
                          message: result.error ?? "",
                          step: steps[result.at ?? 0]?.label,
                        },
                  );
                });
              }}
            >
              <BusyContent busy={testing} busyLabel="Testing…" icon="bolt">
                Test connection
              </BusyContent>
            </Button>
            <Button type="submit" disabled={saving.busy} aria-busy={saving.busy || undefined}>
              <BusyContent busy={saving.busy} busyLabel="Saving…" icon="check">
                Save
              </BusyContent>
            </Button>
            <RequiredNote />
          </FormFoot>
          {showChecks ? (
            <Stack>
              <ChecksList steps={steps} rows={checks.rows} label="Connection test" />
              <div aria-live="polite">
                {outcome === null ? null : outcome.ok ? (
                  <Note kind="ok" icon="check">
                    {outcome.message}
                  </Note>
                ) : (
                  <Note kind="err" icon="alert">
                    <p>
                      <b>Test failed at “{outcome.step}”. </b>
                      {outcome.message}
                    </p>
                  </Note>
                )}
              </div>
            </Stack>
          ) : null}
        </form>
      </Panel>
      <CapabilitiesPanel state={tested ? "ok" : "pending"} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

export function LiveKitSection({ workspace }: { readonly workspace: Workspace }) {
  const [mode, setMode] = useState<LiveKitMode>("managed");
  return (
    <>
      <SettingsHead
        section="livekit"
        title="LiveKit"
        description="All meeting audio, video, agents, recording (Egress) and phone dial-in (SIP) run on LiveKit."
      />
      <div className="flex flex-wrap items-center justify-between gap-s2">
        <SegmentField
          label="Connection mode"
          value={mode}
          options={[
            { value: "managed", label: "KnowMe-managed", icon: "cloud" },
            { value: "own", label: "My own LiveKit project", icon: "server" },
          ]}
          onValueChange={(next) => setMode(next === "own" ? "own" : "managed")}
        />
        <p className="text-sm text-muted-foreground">
          Active now: <b>KnowMe-managed</b>
        </p>
      </div>
      <Stack>
        {mode === "managed" ? <ManagedProject workspace={workspace} /> : <OwnProject />}
      </Stack>
    </>
  );
}
