// TJ-ARCH-MOB-001 compliant
// `#detail:<id>[:<tab>]`: breadcrumb, title, meta line, Download and Share, the
// recording chips, then (transcript and summary tabs) the sticky player beside the
// tabbed section. Tabs are kit Tabs driven by the hash: the selected tab is the
// hash tab, and choosing a tab navigates to `#detail:<id>:<tab>`.
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@know-meet/ui/components/tabs";
import { toast } from "@know-meet/ui/components/toast";
import { cn } from "@know-meet/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { formatBytes, formatDate, formatMinutes } from "../../workspace/application/format";
import type { Recording, Workspace } from "../../workspace/domain/workspace";
import type { RecordingMeta, RecordingTab } from "../domain/recording-details";
import { DELIVERY_RECEIPTS, SUMMARIES, TRANSCRIPTS } from "../application/recording-fixtures";
import { chaptersOf, flattenTranscript, objectKey, segmentIndexAt } from "../application/recordings-model";
import { detailHash, isRecordingTab, RECORDING_TABS } from "../application/recordings-route";
import { BusyLabel } from "./busy-label";
import { DeliveryPanel } from "./delivery-panel";
import { RecordingChips, RecordingsCrumbs } from "./recording-parts";
import { RecordingPlayer } from "./recording-player";
import { ShareDialog } from "./share-dialog";
import { StoragePanel } from "./storage-panel";
import { SummaryPanel } from "./summary-panel";
import { TranscriptPanel } from "./transcript-panel";
import { useBusyTimer } from "./use-busy-timer";
import { usePlayback } from "./use-playback";

interface DetailViewProps {
  readonly workspace: Workspace;
  readonly recording: Recording;
  readonly meta: RecordingMeta;
  readonly tab: RecordingTab;
  readonly onDeleted: (id: string) => void;
}

function MetaLine({ recording, host }: { readonly recording: Recording; readonly host: string }) {
  const items = [
    { icon: "calendar", text: formatDate(recording.date), nowrap: true },
    { icon: "clock", text: formatMinutes(recording.durationMin), nowrap: true },
    { icon: "users", text: `${recording.participants.length} participants`, nowrap: true },
    { icon: "user", text: `Host: ${host}`, nowrap: false },
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-x-s4 gap-y-s2 text-sm text-muted-foreground">
      {items.map((item) => (
        <span key={item.icon} className="inline-flex items-center gap-1.5">
          <KmIcon name={item.icon} className="size-4" />
          <span className={item.nowrap ? "whitespace-nowrap" : undefined}>{item.text}</span>
        </span>
      ))}
    </div>
  );
}

export function DetailView({ workspace, recording, meta, tab, onDeleted }: DetailViewProps) {
  const navigate = useNavigate();
  const [sharing, setSharing] = useState(false);
  const { busy, run } = useBusyTimer();
  const chapters = TRANSCRIPTS[recording.id] ?? [];
  const segments = useMemo(() => flattenTranscript(chapters), [chapters]);
  const chapterMarks = useMemo(() => chaptersOf(chapters), [chapters]);
  const playback = usePlayback(recording.durationMin * 60);
  const currentIndex = segmentIndexAt(segments, playback.t);
  const current = segments[currentIndex] ?? null;
  const showPlayer = tab === "transcript" || tab === "summary";
  const preparing = busy.has("download");
  const fileName = objectKey(recording).split("/").pop() ?? recording.id;

  const download = () =>
    run("download", 900, () =>
      toast.add({ title: `Download started: ${fileName} (${formatBytes(recording.sizeBytes)})`, type: "success" }),
    );

  return (
    <>
      <div className="mb-s5 grid gap-s3">
        <RecordingsCrumbs items={[{ label: "Recordings", hash: "library" }, { label: recording.title }]} className="mb-0" />
        <div className="flex flex-wrap items-start justify-between gap-s4">
          <div className="grid min-w-0 gap-s2">
            <h1 tabIndex={-1} className="text-2xl font-bold [overflow-wrap:anywhere] outline-none">
              {recording.title}
            </h1>
            <MetaLine recording={recording} host={meta.host} />
          </div>
          <div className="flex flex-wrap items-center gap-s2">
            <Button variant="secondary" disabled={preparing} aria-busy={preparing} onClick={download}>
              {preparing ? (
                <BusyLabel label="Preparing…" />
              ) : (
                <>
                  <KmIcon name="download" />
                  <span>Download</span>
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={() => setSharing(true)}>
              <KmIcon name="link" />
              <span>Share</span>
            </Button>
          </div>
        </div>
        <RecordingChips recording={recording} />
      </div>
      <div
        className={cn(
          "grid items-start gap-s5",
          showPlayer
            ? "grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] max-bp1024:grid-cols-[minmax(0,1fr)]"
            : "grid-cols-[minmax(0,1fr)]",
        )}
      >
        {showPlayer ? (
          <div className="sticky top-[calc(var(--spacing-header-h)+var(--spacing-s4))] max-bp1024:static">
            <RecordingPlayer
              workspace={workspace}
              recording={recording}
              chapters={chapterMarks}
              current={current}
              playback={playback}
            />
          </div>
        ) : null}
        <Tabs
          value={tab}
          onValueChange={(next) => {
            if (typeof next === "string" && isRecordingTab(next)) {
              void navigate({ to: "/recordings", hash: detailHash(recording.id, next) });
            }
          }}
          className="min-w-0"
        >
          <TabsList aria-label="Recording sections">
            {RECORDING_TABS.map((spec) => (
              <TabsTrigger key={spec.id} value={spec.id}>
                <KmIcon name={spec.icon} className="size-4" />
                <span>{spec.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={tab} aria-labelledby="tab-h" className="grid gap-s4">
            {tab === "transcript" ? (
              <TranscriptPanel
                workspace={workspace}
                recording={recording}
                chapters={chapters}
                segments={segments}
                currentIndex={currentIndex}
                playback={playback}
              />
            ) : null}
            {tab === "summary" ? (
              <SummaryPanel recording={recording} summary={SUMMARIES[recording.id] ?? { paragraphs: [], decisions: [], actions: [] }} />
            ) : null}
            {tab === "delivery" ? (
              <DeliveryPanel workspace={workspace} recording={recording} initialReceipts={DELIVERY_RECEIPTS[recording.id] ?? {}} />
            ) : null}
            {tab === "storage" ? <StoragePanel recording={recording} meta={meta} onDeleted={onDeleted} /> : null}
          </TabsContent>
        </Tabs>
      </div>
      <ShareDialog recording={recording} host={meta.host} open={sharing} onOpenChange={setSharing} />
    </>
  );
}
