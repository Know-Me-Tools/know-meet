// TJ-ARCH-MOB-001 compliant
// settings.html `#storage`: storage mode (KnowMe-managed or bring your own), where
// new recordings go, links to the S3 and IPFS sub-pages, Egress output options,
// retention and privacy (IPFS is public), and Save. Static sample: no bucket is
// configured yet, so bring-your-own explains how to finish setup.
import { Button } from "@know-meet/ui/components/button";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { useState } from "react";
import type { StorageMode } from "../domain/settings";
import { SegmentField, SelectField, SwitchRow } from "./settings-fields";
import { BusyContent, FormFoot, KeyValue, KeyValueList, NeutralChip, Note, Panel, Stack } from "./settings-parts";
import { SettingsHead } from "./settings-shell";
import { useBusyAction } from "./use-static-delay";
import { SettingsLink } from "./settings-link";

/** settings.html `linkCard()`: a raised card link with a lead tile, text and a trailing chip. */
function LinkCard({ hash, icon, title, description, trail }: {
  readonly hash: "storage-s3" | "storage-ipfs";
  readonly icon: KmIconName;
  readonly title: string;
  readonly description: string;
  readonly trail: React.ReactNode;
}) {
  return (
    <SettingsLink
      hash={hash}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s3 rounded-tile bg-card p-s5 text-foreground no-underline shadow-(--shadow-card) transition-colors duration-(--dur-fast) max-bp768:p-s4 [@media(hover:hover)]:hover:bg-card-hov",
        focusFillClass,
        "focus-visible:**:bg-transparent! focus-visible:**:text-inherit!",
      )}
    >
      <span aria-hidden="true" className="grid size-10 place-items-center rounded-10 bg-muted">
        <KmIcon name={icon} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-sm text-muted-foreground" title={description}>
          {description}
        </span>
      </span>
      <span className="flex items-center gap-s2">
        {trail}
        <KmIcon name="chevron-right" className="size-4" />
      </span>
    </SettingsLink>
  );
}

const inlineLink = cn("text-ember-text underline underline-offset-[3px]", focusFillClass);

function Destination({ mode, ipfs }: { readonly mode: StorageMode; readonly ipfs: boolean }) {
  const byo = mode === "byo";
  return (
    <>
      <Panel
        title="Where new recordings go"
        description={byo ? "Your bucket and pinning service. KnowMe never keeps a copy." : "KnowMe provides S3-compatible storage and IPFS pinning."}
      >
        <KeyValueList>
          {byo ? <KeyValue label="Storage">Not configured</KeyValue> : <KeyValue label="Storage" plain="plain">KnowMe-managed S3-compatible bucket</KeyValue>}
          <KeyValue label="IPFS pinning" plain="plain">
            {ipfs ? "KnowMe pinning" : "Off"}
          </KeyValue>
          <KeyValue label="Existing recordings" plain="plain">
            Stay where they are. Only new recordings use this setting.
          </KeyValue>
        </KeyValueList>
      </Panel>
      {byo ? (
        <Note kind="warn" icon="alert">
          <p>
            Bring your own needs an S3-compatible bucket.{" "}
            <SettingsLink hash="storage-s3" className={inlineLink}>
              Configure S3-compatible storage
            </SettingsLink>{" "}
            before saving.
          </p>
        </Note>
      ) : null}
      <div className="grid grid-cols-2 gap-s4 max-bp768:grid-cols-[minmax(0,1fr)]">
        <LinkCard hash="storage-s3" icon="database" title="S3-compatible storage" description="Amazon S3, R2, B2, Wasabi, MinIO…" trail={<NeutralChip>Not configured</NeutralChip>} />
        <LinkCard hash="storage-ipfs" icon="globe" title="IPFS pinning" description="KnowMe pinning" trail={<NeutralChip>Default</NeutralChip>} />
      </div>
    </>
  );
}

function EgressOutput() {
  const [format, setFormat] = useState("mp4");
  const [layout, setLayout] = useState("speaker");
  const [resolution, setResolution] = useState("1080p");
  const [audioOnly, setAudioOnly] = useState(false);
  return (
    <Panel title="Egress output" description="LiveKit Egress records every participant in one Room Composite.">
      <Stack>
        <div className="flex flex-wrap items-start gap-s5">
          <SegmentField label="Format" value={format} onValueChange={setFormat} options={[{ value: "mp4", label: "MP4 file" }, { value: "hls", label: "HLS segments" }]} />
          <SegmentField label="Layout" value={layout} onValueChange={setLayout} disabled={audioOnly} options={[{ value: "speaker", label: "Speaker" }, { value: "grid", label: "Grid" }]} />
          <SegmentField label="Resolution" value={resolution} onValueChange={setResolution} disabled={audioOnly} options={[{ value: "720p", label: "720p" }, { value: "1080p", label: "1080p" }]} />
        </div>
        <SwitchRow
          label="Audio only"
          description="Record a Room Composite audio mix without video. Smaller files; layout and resolution don’t apply."
          checked={audioOnly}
          onCheckedChange={setAudioOnly}
        />
      </Stack>
    </Panel>
  );
}

export function StorageSection() {
  const [mode, setMode] = useState<StorageMode>("managed");
  const [ipfs, setIpfs] = useState(true);
  const [retention, setRetention] = useState("365");
  const [modeError, setModeError] = useState(false);
  const saving = useBusyAction();
  return (
    <>
      <SettingsHead section="storage" title="Storage" description="Where recordings go after LiveKit Egress writes them, and how they are pinned to IPFS." />
      <Stack>
        <SegmentField
          label="Storage mode"
          value={mode}
          options={[
            { value: "managed", label: "KnowMe-managed", icon: "cloud" },
            { value: "byo", label: "Bring your own", icon: "database" },
          ]}
          onValueChange={(next) => {
            setMode(next === "byo" ? "byo" : "managed");
            setModeError(false);
          }}
        />
        <Destination mode={mode} ipfs={ipfs} />
        <div aria-live="polite">
          {modeError ? (
            <Note kind="err" icon="alert">
              <p>
                Can’t switch to bring your own yet — no bucket is configured.{" "}
                <SettingsLink hash="storage-s3" className={inlineLink}>
                  Set up S3-compatible storage
                </SettingsLink>
                .
              </p>
            </Note>
          ) : null}
        </div>
      </Stack>
      <EgressOutput />
      <Panel title="Retention and privacy">
        <Stack>
          <SelectField
            label="Keep recordings for"
            value={retention}
            options={[["30", "30 days"], ["90", "90 days"], ["365", "1 year"], ["forever", "Forever"]]}
            hint="After this, the file is deleted from storage and unpinned. Transcripts and summaries follow the same schedule."
            onValueChange={setRetention}
          />
          <Note kind="info" icon="lock">
            Recordings are encrypted at rest in S3-compatible storage. For bring-your-own buckets, your bucket’s encryption settings apply.
          </Note>
          <SwitchRow label="Pin recordings to IPFS" description="Keeps a content-addressed copy and stores its CID with the recording." checked={ipfs} onCheckedChange={setIpfs} />
          <Note kind="warn" icon="globe">
            IPFS is a public network: anyone who has a recording’s CID can fetch it through a gateway. Turn pinning off for meetings that must stay private.
          </Note>
        </Stack>
      </Panel>
      <FormFoot>
        <Button
          disabled={saving.busy}
          aria-busy={saving.busy || undefined}
          onClick={() => {
            if (mode === "byo") {
              setModeError(true);
              return;
            }
            saving.start(700, () => toast.add({ title: "Saved. New recordings use KnowMe-managed storage", type: "success" }));
          }}
        >
          <BusyContent busy={saving.busy} busyLabel="Saving…" icon="check">
            Save storage settings
          </BusyContent>
        </Button>
      </FormFoot>
    </>
  );
}
