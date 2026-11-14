// TJ-ARCH-MOB-001 compliant
// settings.html `#storage-ipfs`: pin with KnowMe, a Pinning Service API or your
// own Kubo node; the public gateway and pin-after-upload; a staged local
// "Test pinning" (token "wrong" fails with cause-then-fix copy); Save; and the
// public-network warning.
import { Button } from "@know-meet/ui/components/button";
import { toast } from "@know-meet/ui/components/toast";
import { useMemo, useState } from "react";
import { PIN_TEST_CID } from "../application/settings-fixtures";
import { type FieldRule, validateHttpsUrl, validateKuboRpc } from "../application/validators";
import type { CheckStep, PinningMode } from "../domain/settings";
import { ChecksList } from "./checks-list";
import { SegmentField, SwitchRow, TextField } from "./settings-fields";
import { BusyContent, FormFoot, Note, Panel, RequiredNote, Stack } from "./settings-parts";
import { SettingsHead } from "./settings-shell";
import { useFormErrors } from "./use-form-errors";
import { useStagedChecks } from "./use-staged-checks";
import { useBusyAction } from "./use-static-delay";

type IpfsKey = "gateway" | "endpoint" | "token" | "rpc" | "auth";

const RULES: Readonly<Record<IpfsKey, FieldRule>> = {
  gateway: { label: "Public gateway URL", required: true, validate: validateHttpsUrl },
  endpoint: { label: "Pinning service endpoint", required: true, validate: validateHttpsUrl },
  token: { label: "Access token", required: true },
  rpc: { label: "Kubo RPC API URL", required: true, validate: validateKuboRpc },
  auth: { label: "Authorization" },
};

const KEYS_FOR: Readonly<Record<PinningMode, readonly IpfsKey[]>> = {
  knowme: ["gateway"],
  psa: ["gateway", "endpoint", "token"],
  kubo: ["gateway", "rpc", "auth"],
};

const MODE_LABEL: Readonly<Record<PinningMode, string>> = {
  knowme: "KnowMe pinning",
  psa: "Pinning Service API",
  kubo: "Your Kubo node",
};

function isPinningMode(value: string): value is PinningMode {
  return value === "knowme" || value === "psa" || value === "kubo";
}

export function StorageIpfsSection() {
  const [mode, setMode] = useState<PinningMode>("knowme");
  const [values, setValues] = useState<Readonly<Record<IpfsKey, string>>>({
    gateway: "https://ipfs.io",
    endpoint: "",
    token: "",
    rpc: "http://127.0.0.1:5001",
    auth: "",
  });
  const [pinAfter, setPinAfter] = useState(true);
  const [testState, setTestState] = useState<"idle" | "running" | "done">("idle");
  const [outcome, setOutcome] = useState<{
    readonly ok: boolean;
    readonly step?: string;
    readonly error?: string;
  } | null>(null);
  const { formRef, errors, validate, revalidate } = useFormErrors(RULES);
  const saving = useBusyAction();
  const set = (key: IpfsKey) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    revalidate(key, value);
  };
  const credential =
    mode === "psa" ? values.token.trim() : mode === "kubo" ? values.auth.trim() : "";
  const steps = useMemo<readonly CheckStep[]>(
    () => [
      {
        label: "Reach pinning endpoint",
        detail:
          mode === "knowme"
            ? "KnowMe pinning"
            : mode === "psa"
              ? values.endpoint.trim()
              : values.rpc.trim(),
      },
      {
        label: "Authenticate",
        detail:
          mode === "kubo" && values.auth.trim() === ""
            ? "No authorization set"
            : "Using your credentials",
        fail: () =>
          credential === "wrong"
            ? "The token was rejected (401 Unauthorized). Create a new token with pin permissions and paste it again."
            : null,
      },
      { label: "Pin a small test CID", detail: PIN_TEST_CID },
      { label: "Fetch via gateway", detail: `${values.gateway.trim()}/ipfs/…` },
    ],
    [mode, values.endpoint, values.rpc, values.auth, values.gateway, credential],
  );
  const checks = useStagedChecks(steps);
  const valid = () => validate(values, KEYS_FOR[mode]);

  return (
    <>
      <SettingsHead
        section="storage-ipfs"
        title="IPFS pinning"
        description="After each upload, a KnowMe job pins the recording to IPFS and stores its CID."
        parent={["Storage", "storage"]}
      />
      <form
        ref={formRef}
        noValidate
        className="grid gap-s5"
        onSubmit={(event) => event.preventDefault()}
      >
        <Panel title="Pinning">
          <Stack>
            <SegmentField
              label="Pin with"
              value={mode}
              options={(["knowme", "psa", "kubo"] as const).map((m) => ({
                value: m,
                label: MODE_LABEL[m],
              }))}
              onValueChange={(next) => {
                if (isPinningMode(next)) setMode(next);
              }}
            />
            {mode === "knowme" ? (
              <Note kind="info" icon="info">
                KnowMe pins recordings on its own IPFS nodes. Nothing to configure.
              </Note>
            ) : mode === "psa" ? (
              <>
                <TextField
                  id="ipfs-endpoint"
                  label="Pinning service endpoint"
                  required
                  mono
                  placeholder="https://pinning.example.com/psa"
                  hint="Any service that implements the IPFS Pinning Service API."
                  value={values.endpoint}
                  error={errors.endpoint}
                  onValueChange={set("endpoint")}
                />
                <TextField
                  id="ipfs-token"
                  label="Access token"
                  kind="password"
                  required
                  mono
                  hint="Sent as a bearer token. Stored encrypted; never shown again."
                  value={values.token}
                  error={errors.token}
                  onValueChange={set("token")}
                />
              </>
            ) : (
              <>
                <TextField
                  id="ipfs-rpc"
                  label="Kubo RPC API URL"
                  required
                  mono
                  placeholder="http://127.0.0.1:5001"
                  hint="Your node’s RPC API (port 5001 by default). It must be reachable from KnowMe; 127.0.0.1 only works if the pinning job runs on the same host."
                  value={values.rpc}
                  error={errors.rpc}
                  onValueChange={set("rpc")}
                />
                <TextField
                  id="ipfs-auth"
                  label="Authorization"
                  kind="password"
                  optional
                  mono
                  hint="Basic auth or bearer token, if your RPC API sits behind a proxy."
                  value={values.auth}
                  error={errors.auth}
                  onValueChange={set("auth")}
                />
              </>
            )}
          </Stack>
        </Panel>
        <Panel title="Gateway and timing">
          <Stack>
            <TextField
              id="ipfs-gateway"
              label="Public gateway URL"
              required
              mono
              hint="Used to build links like https://ipfs.io/ipfs/<cid>."
              value={values.gateway}
              error={errors.gateway}
              onValueChange={set("gateway")}
            />
            <SwitchRow
              label="Pin after upload"
              description="Pin each recording as soon as it lands in storage."
              checked={pinAfter}
              onCheckedChange={setPinAfter}
            />
            <FormFoot>
              <Button
                variant="secondary"
                disabled={testState === "running"}
                aria-busy={testState === "running" || undefined}
                onClick={() => {
                  if (!valid()) return;
                  setOutcome(null);
                  setTestState("running");
                  checks.run((result) => {
                    setTestState("done");
                    setOutcome(
                      result.ok
                        ? { ok: true }
                        : { ok: false, step: steps[result.at ?? 0]?.label, error: result.error },
                    );
                  });
                }}
              >
                <BusyContent busy={testState === "running"} busyLabel="Testing…" icon="bolt">
                  Test pinning
                </BusyContent>
              </Button>
              <Button
                disabled={saving.busy}
                aria-busy={saving.busy || undefined}
                onClick={() => {
                  if (!valid()) return;
                  saving.start(700, () =>
                    toast.add({ title: "IPFS pinning saved", type: "success" }),
                  );
                }}
              >
                <BusyContent busy={saving.busy} busyLabel="Saving…" icon="check">
                  Save
                </BusyContent>
              </Button>
              <RequiredNote />
            </FormFoot>
            {testState === "idle" ? null : (
              <Stack>
                <ChecksList steps={steps} rows={checks.rows} label="Pinning test" />
                <div aria-live="polite">
                  {outcome === null ? null : outcome.ok ? (
                    <Note kind="ok" icon="check">
                      Pinned and fetched the test CID. It was unpinned again after the test.
                    </Note>
                  ) : (
                    <Note kind="err" icon="alert">
                      <p>
                        <b>Test failed at “{outcome.step}”. </b>
                        {outcome.error}
                      </p>
                    </Note>
                  )}
                </div>
              </Stack>
            )}
          </Stack>
        </Panel>
      </form>
      <Note kind="warn" icon="globe">
        Pinned content is public to anyone who has the CID. Unpinning removes your copy, but other
        IPFS nodes that fetched the file may keep it.
      </Note>
    </>
  );
}
