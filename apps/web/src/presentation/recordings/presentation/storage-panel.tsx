// TJ-ARCH-MOB-001 compliant
// `#detail:<id>:storage`: where the file lives (egress, provider, bucket, object
// key, checksum, IPFS CID, gateway URL, pin status, retention) with copy buttons,
// the CID exposure note, and the delete danger zone (confirm, then simulated
// delete and unpin, back to the library).
import { Badge, BadgePip } from "@know-meet/ui/components/badge";
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { cardVariants } from "@know-meet/ui/components/card";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { copyText } from "../../shared/copy-text";
import { formatBytes } from "../../workspace/application/format";
import type { Recording } from "../../workspace/domain/workspace";
import type { RecordingMeta } from "../domain/recording-details";
import { gatewayUrl, objectKey } from "../application/recordings-model";
import { BusyLabel } from "./busy-label";
import { ConfirmDialog } from "./confirm-dialog";
import { Note } from "./recording-parts";
import { useBusyTimer } from "./use-busy-timer";

function CopyButton({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Copy ${label}`}
      title="Copy"
      onClick={() => void copyText(value)}
      className="ml-1 size-8 align-middle"
    >
      <KmIcon name="copy" className="size-4" />
    </Button>
  );
}

interface Entry {
  readonly term: string;
  readonly value: ReactNode;
  /** Body face instead of mono (km.css `.kv dd.plain`). */
  readonly plain?: boolean;
}

function entriesFor(recording: Recording, meta: RecordingMeta): readonly Entry[] {
  const key = objectKey(recording);
  const gateway = gatewayUrl(recording);
  return [
    { term: "Egress type", value: "Room Composite", plain: true },
    { term: "Layout", value: recording.layout === "grid" ? "Grid" : "Speaker", plain: true },
    { term: "Format", value: recording.format.toUpperCase() },
    { term: "Resolution", value: meta.resolution, plain: true },
    { term: "Provider", value: meta.provider, plain: true },
    { term: "Endpoint", value: meta.endpoint },
    { term: "Region", value: meta.region },
    {
      term: "Bucket",
      value: (
        <span>
          {recording.bucket}
          {recording.storage === "byo" ? <Badge className="ml-s2">Your bucket</Badge> : null}
        </span>
      ),
    },
    { term: "Object key", value: <span>{key}<CopyButton label="object key" value={key} /></span> },
    { term: "Size", value: <span className="whitespace-nowrap">{formatBytes(recording.sizeBytes)}</span> },
    {
      term: "Checksum",
      value: (
        <span>
          {meta.checksum} <span className="font-body text-muted-foreground">(sample)</span>
        </span>
      ),
    },
    { term: "IPFS CID", value: <span>{recording.cid}<CopyButton label="CID" value={recording.cid} /></span> },
    { term: "Gateway URL", value: <span>{gateway}<CopyButton label="gateway URL" value={gateway} /></span> },
    {
      term: "Pin status",
      value: (
        <Badge variant="green">
          <BadgePip />
          <span>{meta.pin}</span>
        </Badge>
      ),
      plain: true,
    },
    { term: "Retention", value: meta.retention, plain: true },
  ];
}

export function StoragePanel({
  recording,
  meta,
  onDeleted,
}: {
  readonly recording: Recording;
  readonly meta: RecordingMeta;
  readonly onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const { busy, run } = useBusyTimer();
  const deleting = busy.has("delete");
  const byo = recording.storage === "byo";
  const place = byo ? `your bucket ${recording.bucket}` : "KnowMe-managed storage";
  const host = byo ? "your pinning service" : "KnowMe";

  const remove = () =>
    run("delete", 1100, () => {
      toast.add({ title: "Recording deleted and unpinned", type: "success" });
      onDeleted(recording.id);
    });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-s2">
        <div className="grid gap-s2">
          <h2 id="tab-h">Storage</h2>
          <p className="text-sm text-muted-foreground">
            {byo
              ? "This recording lives in your own bucket and is pinned through your pinning service."
              : "This recording is stored and pinned by KnowMe."}
          </p>
        </div>
        <Link
          to="/settings"
          hash={byo ? "storage-s3" : "storage"}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), focusFillClass)}
        >
          <KmIcon name="settings" className="size-4" />
          <span>Storage settings</span>
        </Link>
      </div>
      <div className={cardVariants({ variant: "panel" })}>
        <dl className="m-0 grid grid-cols-[minmax(120px,max-content)_minmax(0,1fr)] gap-x-s5 gap-y-s2 max-bp768:grid-cols-[minmax(0,1fr)] max-bp768:gap-0.5">
          {entriesFor(recording, meta).map((entry) => (
            <div key={entry.term} className="contents max-bp768:[&:not(:first-child)>dt]:mt-s3">
              <dt className="pt-0.5 text-sm text-muted-foreground">{entry.term}</dt>
              <dd
                className={cn(
                  "m-0 min-w-0 [overflow-wrap:anywhere]",
                  entry.plain === true ? "font-body text-sm" : "font-mono text-13",
                )}
              >
                {entry.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <Note kind="info" icon="info">
        IPFS content is addressed by its CID. Anyone who has the CID can fetch the file from a public gateway, so share the
        CID only with people who should see the recording.
      </Note>
      <section aria-labelledby="dz-h" className={cardVariants({ variant: "panel" })}>
        <h3 id="dz-h">Delete recording</h3>
        <p className="text-sm text-muted-foreground">
          Removes the file from storage, the transcript and summary from KnowMe, and unpins it from IPFS. This can’t be
          undone.
        </p>
        <div>
          <Button variant="destructive" disabled={deleting} aria-busy={deleting} onClick={() => setConfirming(true)}>
            {deleting ? (
              <BusyLabel label="Deleting…" />
            ) : (
              <>
                <KmIcon name="trash" />
                <span>Delete recording</span>
              </>
            )}
          </Button>
        </div>
      </section>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this recording?"
        confirmLabel="Delete recording"
        tone="danger"
        onConfirm={remove}
      >
        <div className="grid gap-s2">
          <p>
            This deletes “{recording.title}” from {place}, removes the transcript and summary from KnowMe, and unpins the
            CID.
          </p>
          <p>
            Unpinning stops {host} from hosting the file, but copies other IPFS nodes already fetched may persist and stay
            reachable by CID. Links already sent to participants will stop working.
          </p>
        </div>
      </ConfirmDialog>
    </>
  );
}
