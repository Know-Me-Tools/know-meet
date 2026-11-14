// TJ-ARCH-MOB-001 compliant
// settings.html `#storage-test-failed`: what failed (cause first, in words), the
// staged checks as they ended, the raw provider response as labelled secondary
// detail (F9: the code is never the message), a fix-it checklist and Retry.
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { CodePanel } from "@know-meet/ui/components/code-panel";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { useMemo, useState } from "react";
import { copyText } from "../../shared/copy-text";
import { FAILED_STORAGE_TEST, S3_PROVIDERS } from "../application/settings-fixtures";
import type { CheckRowState, CheckStep } from "../domain/settings";
import { ChecksList } from "./checks-list";
import { CheckRow } from "./settings-fields";
import { SettingsLink } from "./settings-link";
import { BusyContent, FormFoot, Note, Panel, Stack } from "./settings-parts";
import { SettingsHead } from "./settings-shell";
import { useStagedChecks } from "./use-staged-checks";

const F = FAILED_STORAGE_TEST;
const NOT_FOUND = `Bucket not found: ${F.bucket}`;
const PROVIDER_NAME = S3_PROVIDERS[F.provider].name;

const RAW_RESPONSE = [
  `PUT /${F.bucket}/${F.object}${F.pathStyle ? "  (path style)" : ""}`,
  "HTTP/1.1 404 Not Found",
  "",
  '<?xml version="1.0" encoding="UTF-8"?>',
  "<Error>",
  "  <Code>NoSuchBucket</Code>",
  "  <Message>The specified bucket does not exist.</Message>",
  `  <BucketName>${F.bucket}</BucketName>`,
  "</Error>",
].join("\n");

const FIXES: readonly string[] = [
  "Check the bucket name for typos. Names are lowercase and must match exactly.",
  `Create the bucket in your ${PROVIDER_NAME} console if it doesn’t exist yet.`,
  "Confirm the endpoint points at the right account and region.",
  "Make sure the access key can PutObject, GetObject and DeleteObject on this bucket.",
  "For non-AWS providers, keep Force path style on.",
];

const linkButton = (variant: "secondary" | "ghost") =>
  cn(buttonVariants({ variant }), focusFillClass);

export function StorageTestFailedSection() {
  const steps = useMemo<readonly CheckStep[]>(
    () => [
      { label: "Connect to endpoint", detail: F.endpoint },
      { label: "Write test object", detail: `PUT ${F.bucket}/${F.object}`, fail: () => NOT_FOUND },
      { label: "Read it back", detail: "GET and compare checksum" },
      { label: "Delete test object", detail: `DELETE ${F.bucket}/${F.object}` },
    ],
    [],
  );
  const preset = useMemo<readonly CheckRowState[]>(
    () => [
      { state: "ok", text: "Passed", detail: F.endpoint },
      { state: "fail", text: "Failed", detail: NOT_FOUND },
      { state: "skip", text: "Skipped", detail: "GET and compare checksum" },
      { state: "skip", text: "Skipped", detail: `DELETE ${F.bucket}/${F.object}` },
    ],
    [],
  );
  const checks = useStagedChecks(steps, preset);
  const [retrying, setRetrying] = useState(false);
  const [stillFailing, setStillFailing] = useState(false);
  const [fixed, setFixed] = useState<readonly boolean[]>(() => FIXES.map(() => false));

  return (
    <>
      <SettingsHead
        section="storage-test-failed"
        title="Storage test failed"
        description="KnowMe couldn’t write to your bucket, so new recordings won’t upload until this is fixed."
        parent={["S3-compatible storage", "storage-s3"]}
      />
      <Panel title="What failed" description={`${PROVIDER_NAME} · ${F.endpoint}`}>
        <Stack>
          <Note kind="err" icon="alert">
            <p>
              <b>Step 2 of 4 — Write test object. </b>
              {NOT_FOUND}
            </p>
          </Note>
          <ChecksList steps={steps} rows={checks.rows} label="Storage test" />
          <div aria-live="polite">
            {stillFailing ? (
              <Note kind="err" icon="alert">
                Still failing: bucket {F.bucket} was not found. Fix the bucket name or create the
                bucket, then edit your settings.
              </Note>
            ) : null}
          </div>
        </Stack>
      </Panel>
      <Panel
        title="Raw provider error"
        trail={
          <Button variant="secondary" size="sm" onClick={() => void copyText(RAW_RESPONSE)}>
            <KmIcon name="copy" className="size-4" />
            <span>Copy</span>
          </Button>
        }
      >
        <CodePanel label="Raw provider error" tone="inset">
          {RAW_RESPONSE}
        </CodePanel>
      </Panel>
      <Panel title="How to fix it" description="Tick items off as you go.">
        <div>
          {FIXES.map((text, i) => (
            <CheckRow
              key={text}
              id={`fix-${i}`}
              label={text}
              checked={fixed[i] === true}
              onCheckedChange={(checked) =>
                setFixed((current) => current.map((v, j) => (j === i ? checked : v)))
              }
            />
          ))}
        </div>
      </Panel>
      <FormFoot>
        <Button
          disabled={retrying}
          aria-busy={retrying || undefined}
          onClick={() => {
            setStillFailing(false);
            setRetrying(true);
            checks.run(() => {
              setRetrying(false);
              setStillFailing(true);
            });
          }}
        >
          <BusyContent busy={retrying} busyLabel="Retrying…" icon="refresh">
            Retry test
          </BusyContent>
        </Button>
        <SettingsLink hash="storage-s3" className={linkButton("secondary")}>
          <KmIcon name="edit" />
          <span>Edit storage settings</span>
        </SettingsLink>
        <SettingsLink hash="storage" className={linkButton("ghost")}>
          Back to storage
        </SettingsLink>
      </FormFoot>
    </>
  );
}
