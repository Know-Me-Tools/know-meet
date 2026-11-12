// TJ-ARCH-MOB-001 compliant
// settings.html `#storage-s3`: bring-your-own bucket form (provider, region,
// endpoint, bucket, prefix, access key, secret, path style), a staged local
// "Test connection" (bucket "missing-bucket" fails and opens the failure page),
// and Save with a confirm when untested. No network; secrets are never kept.
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { isS3Provider, S3_PROVIDER_ORDER, S3_PROVIDERS } from "../application/settings-fixtures";
import { type FieldRule, validateBucket, validatePrefix, validateS3Endpoint } from "../application/validators";
import type { CheckStep, S3ProviderKey } from "../domain/settings";
import { ChecksList } from "./checks-list";
import { ConfirmDialog, type ConfirmRequest } from "./confirm-dialog";
import { SelectField, SwitchRow, TextField } from "./settings-fields";
import { BusyContent, FieldRow, FormFoot, Note, Panel, RequiredNote, Stack } from "./settings-parts";
import { SettingsHead } from "./settings-shell";
import { useFormErrors } from "./use-form-errors";
import { useStagedChecks } from "./use-staged-checks";
import { useBusyAction, useLater } from "./use-static-delay";
import { SettingsLink } from "./settings-link";

type S3Key = "endpoint" | "region" | "bucket" | "prefix" | "keyId" | "secret";

const RULES: Readonly<Record<S3Key, FieldRule>> = {
  endpoint: { label: "Endpoint URL", required: true, validate: validateS3Endpoint },
  region: { label: "Region", required: true },
  bucket: { label: "Bucket", required: true, validate: validateBucket },
  prefix: { label: "Path prefix", validate: validatePrefix },
  keyId: { label: "Access key ID", required: true },
  secret: { label: "Secret access key", required: true },
};

const TEST_OBJECT = ".knowme-test-mk2q8z.txt";

export function StorageS3Section() {
  const [provider, setProvider] = useState<S3ProviderKey>("r2");
  const [values, setValues] = useState<Readonly<Record<S3Key, string>>>({ endpoint: "", region: "auto", bucket: "", prefix: "meet/", keyId: "", secret: "" });
  const [pathStyle, setPathStyle] = useState(true);
  const [tested, setTested] = useState(false);
  const [testState, setTestState] = useState<"idle" | "running" | "ok" | "failed">("idle");
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const { formRef, errors, validate, revalidate } = useFormErrors(RULES);
  const saving = useBusyAction();
  const later = useLater();
  const navigate = useNavigate();
  const hint = S3_PROVIDERS[provider].endpointHint;
  const objectPath = `${values.prefix.trim() === "" ? "" : values.prefix.trim().replace(/\/?$/, "/")}${TEST_OBJECT}`;
  const bucket = values.bucket.trim();
  const steps = useMemo<readonly CheckStep[]>(
    () => [
      { label: "Connect to endpoint", detail: values.endpoint.trim() },
      {
        label: "Write test object",
        detail: `PUT ${bucket}/${objectPath}`,
        fail: () => (bucket === "missing-bucket" ? `Bucket not found: ${bucket}` : null),
      },
      { label: "Read it back", detail: "GET and compare checksum" },
      { label: "Delete test object", detail: `DELETE ${bucket}/${objectPath}` },
    ],
    [values.endpoint, bucket, objectPath],
  );
  const checks = useStagedChecks(steps);
  const set = (key: S3Key) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    revalidate(key, value);
  };
  const commit = () =>
    saving.start(700, () => {
      setValues((current) => ({ ...current, secret: "" }));
      toast.add({ title: "Bucket saved", type: "success" });
    });

  return (
    <>
      <SettingsHead
        section="storage-s3"
        title="S3-compatible storage"
        description="Bring your own bucket. LiveKit Egress writes recordings here, then KnowMe pins them to IPFS."
        parent={["Storage", "storage"]}
      />
      <Panel title="Bucket">
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
              body: "If the bucket or keys are wrong, new recordings will fail to upload and stay in the processing queue until fixed.",
              confirmLabel: "Save anyway",
              onConfirm: commit,
            });
          }}
        >
          <FieldRow>
            <SelectField
              label="Provider"
              required
              value={provider}
              options={S3_PROVIDER_ORDER.map((key) => [key, S3_PROVIDERS[key].name] as const)}
              onValueChange={(next) => {
                if (!isS3Provider(next)) return;
                setProvider(next);
                setPathStyle(next !== "aws");
                setValues((current) => ({
                  ...current,
                  region: current.region === "" || current.region === "auto" || next === "r2" ? S3_PROVIDERS[next].region : current.region,
                  endpoint: next === "aws" && current.endpoint === "" ? `https://s3.${current.region || "us-east-1"}.amazonaws.com` : current.endpoint,
                }));
              }}
            />
            <TextField id="s3-region" label="Region" required mono hint="R2 uses auto." value={values.region} error={errors.region} onValueChange={set("region")} />
          </FieldRow>
          <TextField id="s3-endpoint" label="Endpoint URL" required mono placeholder={hint} hint={`e.g. ${hint}`} value={values.endpoint} error={errors.endpoint} onValueChange={set("endpoint")} />
          <FieldRow>
            <TextField id="s3-bucket" label="Bucket" required mono placeholder="acme-meet-archive" value={values.bucket} error={errors.bucket} onValueChange={set("bucket")} />
            <TextField id="s3-prefix" label="Path prefix" optional mono placeholder="meet/" hint="Recordings are written under this folder, e.g. meet/2026/10/14/…" value={values.prefix} error={errors.prefix} onValueChange={set("prefix")} />
          </FieldRow>
          <FieldRow>
            <TextField id="s3-key" label="Access key ID" required mono autoComplete="off" value={values.keyId} error={errors.keyId} onValueChange={set("keyId")} />
            <TextField
              id="s3-secret"
              label="Secret access key"
              kind="password"
              required
              mono
              hint="Needs PutObject, GetObject and DeleteObject on this bucket. Stored encrypted; never shown again."
              value={values.secret}
              error={errors.secret}
              onValueChange={set("secret")}
            />
          </FieldRow>
          <SwitchRow
            label="Force path style"
            description="Uses endpoint/bucket/key URLs instead of bucket.endpoint/key. LiveKit Egress needs this (force_path_style) for most non-AWS endpoints, so it turns on automatically for them."
            checked={pathStyle}
            onCheckedChange={setPathStyle}
          />
          <FormFoot>
            <Button
              variant="secondary"
              disabled={testState === "running"}
              aria-busy={testState === "running" || undefined}
              onClick={() => {
                if (!validate(values)) return;
                setTestState("running");
                checks.run((result) => {
                  if (result.ok) {
                    setTested(true);
                    setTestState("ok");
                    return;
                  }
                  setTestState("failed");
                  later(900, () => void navigate({ to: "/settings", hash: "storage-test-failed" }));
                });
              }}
            >
              <BusyContent busy={testState === "running"} busyLabel="Testing…" icon="bolt">
                Test connection
              </BusyContent>
            </Button>
            <Button type="submit" disabled={saving.busy} aria-busy={saving.busy || undefined}>
              <BusyContent busy={saving.busy} busyLabel="Saving…" icon="check">
                Save
              </BusyContent>
            </Button>
            <SettingsLink hash="storage" className={cn(buttonVariants({ variant: "ghost" }), focusFillClass)}>
              Back to storage
            </SettingsLink>
            <RequiredNote />
          </FormFoot>
          {testState === "idle" ? null : (
            <Stack>
              <ChecksList steps={steps} rows={checks.rows} label="Storage test" />
              <div aria-live="polite">
                {testState === "ok" ? (
                  <Note kind="ok" icon="check">
                    Write, read and delete all worked. Save to use this bucket for new recordings.
                  </Note>
                ) : testState === "failed" ? (
                  <Note kind="err" icon="alert">
                    The test couldn’t write to your bucket. Opening the details…
                  </Note>
                ) : null}
              </div>
            </Stack>
          )}
        </form>
      </Panel>
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
