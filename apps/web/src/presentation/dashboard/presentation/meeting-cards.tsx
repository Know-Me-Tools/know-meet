// TJ-ARCH-MOB-001 compliant
// dashboard.html meeting detail cards: Join info, Recording & transcript, Agents &
// dots scheduled, Pre-reads in knowledge. The invitees table is in
// meeting-invitees-card.tsx.
import { Badge } from "@know-meet/ui/components/badge";
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { Card, CardHeader } from "@know-meet/ui/components/card";
import { AgentGlyph } from "@know-meet/ui/components/glyph";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Orb } from "@know-meet/ui/components/orb";
import { toast } from "@know-meet/ui/components/toast";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { copyText } from "../../shared/copy-text";
import { type DashboardMeeting, MAX_FILE_BYTES } from "../domain/dashboard";
import { useDashboard } from "./dashboard-context";
import { smallLinkClass, StateLine, SwitchRow } from "./dashboard-parts";
import { FileList } from "./schedule-sections";

function CardHead({ id, title, sub, action }: { readonly id: string; readonly title: string; readonly sub?: string; readonly action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-s3">
      <CardHeader className="min-w-0">
        <h2 id={id} className="text-lg">
          {title}
        </h2>
        {sub ? <span className="text-sm text-muted-foreground">{sub}</span> : null}
      </CardHeader>
      {action}
    </div>
  );
}

function CopyValue({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <Button variant="ghost" size="icon-xs" className="ml-1 size-8 align-middle" aria-label={`Copy ${label}`} title="Copy" onClick={() => void copyText(value)}>
      <KmIcon name="copy" className="size-4" />
    </Button>
  );
}

export function JoinInfoCard({ meeting }: { readonly meeting: DashboardMeeting }) {
  const { workspace, joinUrlFor } = useDashboard();
  const url = joinUrlFor(meeting.joinCode);
  const rows: { readonly term: string; readonly value: React.ReactNode }[] = [
    { term: "Join link", value: <><span>{url}</span><CopyValue label="join link" value={url} /></> },
    { term: "Join code", value: <><span>{meeting.joinCode}</span><CopyValue label="join code" value={meeting.joinCode} /></> },
  ];
  if (meeting.dialIn) {
    const pin = meeting.dialIn.pin;
    for (const n of workspace.telnyx.dialIn) {
      rows.push({ term: `Dial-in (${n.region})`, value: <><span className="whitespace-nowrap">{n.number}</span><CopyValue label={`${n.region} dial-in number`} value={n.number} /></> });
    }
    rows.push({ term: "PIN", value: <><span className="whitespace-nowrap">{pin}</span><CopyValue label="PIN" value={pin.replace(/\s/g, "")} /></> });
  }
  return (
    <Card role="region" aria-labelledby="ji-title">
      <h2 id="ji-title" className="text-lg">
        Join info
      </h2>
      <dl className="m-0 grid grid-cols-[minmax(120px,max-content)_minmax(0,1fr)] gap-x-s5 gap-y-s2">
        {rows.map((row) => (
          <div key={row.term} className="contents">
            <dt className="pt-0.5 text-sm text-muted-foreground">{row.term}</dt>
            <dd className="m-0 min-w-0 font-mono text-13 [overflow-wrap:anywhere]">{row.value}</dd>
          </div>
        ))}
        {meeting.dialIn ? null : (
          <div className="contents">
            <dt className="pt-0.5 text-sm text-muted-foreground">Dial-in</dt>
            <dd className="m-0 min-w-0 text-sm">Off for this meeting. Turn it on from Edit.</dd>
          </div>
        )}
      </dl>
      {meeting.dialIn ? (
        <p className="text-xs text-muted-foreground">Phone callers dial in to the room and enter the PIN. KnowMe never places outbound calls.</p>
      ) : null}
    </Card>
  );
}

export function RecordingCard({ meeting, editable }: { readonly meeting: DashboardMeeting; readonly editable: boolean }) {
  const { dispatch } = useDashboard();
  const toggle = (key: "record" | "transcribe" | "sendSummary", label: string) => (checked: boolean) => {
    const changes: Partial<DashboardMeeting> =
      key === "record" ? { record: checked } : key === "transcribe" ? { transcribe: checked } : { sendSummary: checked };
    dispatch({ type: "override", id: meeting.id, changes });
    toast.add({ title: `${label}${checked ? " on" : " off"} for this meeting`, type: "success" });
  };
  return (
    <Card role="region" aria-labelledby="rec-title">
      <CardHead
        id="rec-title"
        title="Recording & transcript"
        sub="Saved to KnowMe-managed S3 storage, then pinned to IPFS."
        action={
          <Link to="/settings" hash="recording" className={smallLinkClass}>
            Defaults
          </Link>
        }
      />
      <div>
        <SwitchRow id="d-rec" label="Record automatically" hint="Room Composite (all participants, one layout) · MP4" checked={meeting.record} disabled={!editable} onCheckedChange={toggle("record", "Recording")} />
        <SwitchRow id="d-tr" label="Live transcription" hint="Feeds the meeting’s knowledge base" checked={meeting.transcribe} disabled={!editable} onCheckedChange={toggle("transcribe", "Live transcription")} />
        <SwitchRow
          id="d-sum"
          label="Send transcript & summary"
          hint={
            <>
              Email + SMS link after the meeting ·{" "}
              <Link to="/settings" hash="delivery">
                Delivery settings
              </Link>
            </>
          }
          checked={meeting.sendSummary}
          disabled={!editable}
          onCheckedChange={toggle("sendSummary", "Transcript & summary delivery")}
        />
      </div>
      {editable ? null : <p className="text-xs text-muted-foreground">These settings can’t be changed for a meeting that has ended or was cancelled.</p>}
    </Card>
  );
}

const lineClass = "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s3 py-s2";

export function AgentsCard({ meeting, editable }: { readonly meeting: DashboardMeeting; readonly editable: boolean }) {
  const { workspace } = useDashboard();
  const concierge = workspace.agents.find((a) => a.id === "concierge");
  const agents = meeting.agents.filter((id) => id !== "concierge").flatMap((id) => workspace.agents.filter((a) => a.id === id));
  const dots = meeting.dots.flatMap((id) => workspace.dots.filter((d) => d.id === id));
  return (
    <Card role="region" aria-labelledby="ag-title">
      <CardHead
        id="ag-title"
        title="Agents & dots scheduled"
        sub="Dispatched into the room when the meeting starts."
        action={
          editable ? (
            <Link to="/dashboard" hash={`schedule?edit=${encodeURIComponent(meeting.id)}`} className={smallLinkClass}>
              Change
            </Link>
          ) : null
        }
      />
      <ul className="m-0 grid list-none p-0">
        <li className={lineClass}>
          <AgentGlyph size="sm" tone="system">
            {concierge?.mono ?? "CG"}
          </AgentGlyph>
          <span className="grid min-w-0 gap-0.5 *:block">
            <strong className="text-sm">Concierge</strong>
            <span className="text-xs text-muted-foreground">System agent · always present, and the only agent guests get</span>
          </span>
          <Badge variant="ember">Always</Badge>
        </li>
        {agents.map((agent) => (
          <li key={agent.id} className={lineClass}>
            <AgentGlyph size="sm">{agent.mono}</AgentGlyph>
            <span className="grid min-w-0 gap-0.5 *:block">
              <Link to="/agents" hash={`detail:${agent.id}`} className="text-sm">
                {agent.name}
              </Link>
              <span className="truncate text-xs text-muted-foreground" title={agent.desc}>
                {agent.role} · {agent.worker}
              </span>
            </span>
            <StateLine status={agent.status} label={agent.status === "online" ? "Online" : "Offline"} />
          </li>
        ))}
        {dots.map((dot) => (
          <li key={dot.id} className={lineClass}>
            <Orb tone={dot.color} className="w-7" />
            <span className="grid min-w-0 gap-0.5 *:block">
              {dot.id === "iris" ? (
                <Link to="/agents" hash="dot:iris" className="text-sm">
                  {dot.name}
                </Link>
              ) : (
                <strong className="text-sm">{dot.name}</strong>
              )}
              <span className="text-xs text-muted-foreground">{dot.ownerLabel} · private memory</span>
            </span>
            <Badge>Dot</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PreReadsCard({ meeting, editable }: { readonly meeting: DashboardMeeting; readonly editable: boolean }) {
  const { dispatch } = useDashboard();
  const setFiles = (files: DashboardMeeting["preReads"]) => dispatch({ type: "set-pre-reads", id: meeting.id, files });
  const add = (list: FileList) => {
    let files = meeting.preReads;
    let skipped = 0;
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_BYTES) skipped++;
      else if (!files.some((x) => x.name === file.name)) files = [...files, { name: file.name, size: file.size }];
    }
    setFiles(files);
    toast.add({ title: skipped ? `${skipped} file over 50 MB skipped — others added` : "Added to meeting knowledge", type: skipped ? "warning" : "success" });
  };
  return (
    <Card role="region" aria-labelledby="pr-title">
      <CardHead
        id="pr-title"
        title="Pre-reads in knowledge"
        sub="Every agent in the room, including Concierge, can search these."
        action={
          editable ? (
            <div>
              <input
                id="d-files"
                type="file"
                multiple
                className="peer sr-only"
                onChange={(e) => {
                  if (e.target.files) add(e.target.files);
                  e.target.value = "";
                }}
              />
              <label
                htmlFor="d-files"
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "cursor-pointer peer-focus-visible:bg-focus! peer-focus-visible:text-on-focus!")}
              >
                <KmIcon name="upload" className="size-4" />
                <span>Add</span>
              </label>
            </div>
          ) : null
        }
      />
      <FileList
        files={meeting.preReads}
        emptyText="No pre-reads yet. Attach documents so agents can cite them during the meeting."
        metaSuffix=" · in meeting knowledge"
        onRemove={
          editable
            ? (index) => {
                setFiles(meeting.preReads.filter((_, i) => i !== index));
                toast.add({ title: "Pre-read removed", type: "success" });
              }
            : undefined
        }
      />
    </Card>
  );
}
