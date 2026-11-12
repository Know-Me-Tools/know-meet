// TJ-ARCH-MOB-001 compliant
// Detail tab panels (agents.html `detailOverview`, `detailActivity`,
// `detailSettings`, `detailDanger`). Activity is a wide table in its own named
// scroll region (RV-21). Saving is simulated (static UI): busy state, then a toast.
import { Badge } from "@know-meet/ui/components/badge";
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { cardVariants } from "@know-meet/ui/components/card";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@know-meet/ui/components/empty";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { TableRegion } from "@know-meet/ui/components/table-region";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { formatDate, formatMinutes, formatTime } from "../../workspace/application/format";
import { activityFor } from "../application/agents-fixtures";
import {
  autoJoinText,
  dispatchText,
  KNOWLEDGE,
  MEDIA,
  type MediaMode,
  OUTCOME,
  projectText,
  type RegistryAgent,
} from "../domain/agent-config";
import { SelectField, SwitchRow } from "./agent-form-fields";
import { useAgentsState } from "./agents-state";
import { KeyValues, Masked, Notice } from "./agents-ui";
import { ConfirmDialog } from "./confirm-dialog";

const SAVE_MS = 700;
const twoColClass =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-s5 max-bp1024:grid-cols-[minmax(0,1fr)]";

export function DetailOverview({ agent }: { readonly agent: RegistryAgent }) {
  const { workspace } = useAgentsState();
  const project = projectText(agent, workspace.livekit.url);
  return (
    <div className={twoColClass}>
      <section aria-labelledby="ov-about" className={cardVariants()}>
        <h2 id="ov-about" className="text-lg">
          About
        </h2>
        <p>{agent.desc || "No description yet."}</p>
        {agent.status === "offline" ? (
          <Notice tone="warn" icon="alert">
            <strong>Worker offline</strong>
            <span>{`Dispatches to this agent will fail until its worker reconnects to ${project}.`}</span>
          </Notice>
        ) : null}
        {agent.system ? (
          <Notice icon="shield">
            <strong>Managed by KnowMe</strong>
            <span>
              The Concierge can’t be unregistered or reconfigured. It joins every meeting, including
              guest meetings, and keeps nothing after the meeting ends.
            </span>
          </Notice>
        ) : null}
      </section>
      <section aria-labelledby="ov-config" className={cardVariants()}>
        <h2 id="ov-config" className="text-lg">
          Configuration
        </h2>
        <KeyValues
          rows={[
            ["agent_name", agent.worker, "mono"],
            ["LiveKit project", project, "mono"],
            ...(agent.project === "own"
              ? ([["API key", <Masked key="key" />, "plain"]] as const)
              : []),
            ["Media", MEDIA[agent.media].label, "plain"],
            ["Knowledge", KNOWLEDGE[agent.knowledge].label, "plain"],
            ["Dispatch", dispatchText(agent), "plain"],
            ["Auto-join", autoJoinText(agent), "plain"],
            ["Owner", agent.owner, "plain"],
          ]}
        />
      </section>
    </div>
  );
}

export function DetailActivity({ agent }: { readonly agent: RegistryAgent }) {
  const { workspace } = useAgentsState();
  const records = activityFor(agent.id, workspace);
  if (records.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <KmIcon name="clock" />
        </EmptyMedia>
        <EmptyTitle render={(headingProps) => <h2 {...headingProps} />}>
          No dispatches yet
        </EmptyTitle>
        <EmptyDescription>
          {`When ${agent.name} joins a meeting, it shows up here with how long it stayed and how it went.`}
        </EmptyDescription>
        <Link
          to="/dashboard"
          hash="upcoming"
          className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}
        >
          <KmIcon name="calendar" className="size-4" />
          <span>See upcoming meetings</span>
        </Link>
      </Empty>
    );
  }
  return (
    <div className="grid content-start gap-s4">
      <h2 className="text-lg">Recent dispatches</h2>
      <TableRegion caption={`Recent dispatches of ${agent.name}`}>
        <thead>
          <tr>
            <th scope="col">Meeting</th>
            <th scope="col">Date</th>
            <th scope="col" className="text-right! tabular-nums">
              Duration
            </th>
            <th scope="col">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const outcome = OUTCOME[record.outcome];
            const live = record.outcome === "live";
            return (
              <tr key={`${record.meeting}-${record.date}`}>
                <td>
                  <span className="line-clamp-2" title={record.meeting}>
                    {record.meeting}
                  </span>
                </td>
                <td className="whitespace-nowrap">
                  {live ? `Today · ${formatTime(record.date)}` : formatDate(record.date)}
                </td>
                <td className="text-right! whitespace-nowrap tabular-nums">
                  {live ? "In progress" : record.min ? formatMinutes(record.min) : "—"}
                </td>
                <td>
                  <Badge variant={outcome.tone}>{outcome.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableRegion>
    </div>
  );
}

interface SettingsDraft {
  readonly paused: boolean;
  readonly knowledge: RegistryAgent["knowledge"];
  readonly dispatch: RegistryAgent["dispatch"];
  readonly autoJoin: RegistryAgent["autoJoin"];
  readonly media: MediaMode;
}

export function DetailSettings({ agent }: { readonly agent: RegistryAgent }) {
  const [next, setNext] = useState<SettingsDraft>({
    paused: agent.paused,
    knowledge: agent.knowledge,
    dispatch: agent.dispatch,
    autoJoin: agent.autoJoin,
    media: agent.media,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const change = (patch: Partial<SettingsDraft>) => {
    setNext((current) => ({ ...current, ...patch }));
    setDirty(true);
  };
  const noKnowledge = next.knowledge === "none";

  return (
    <form
      aria-labelledby="set-title"
      noValidate
      className={cardVariants({ variant: "panel" })}
      onSubmit={(event) => {
        event.preventDefault();
        setSaving(true);
        timer.current = window.setTimeout(() => {
          setSaving(false);
          setDirty(false);
          toast.add({ title: `${agent.name} settings saved`, type: "success" });
        }, SAVE_MS);
      }}
    >
      <h2 id="set-title" className="text-lg">
        Settings
      </h2>
      <div>
        <SwitchRow
          id="s-avail"
          label="Available for dispatch"
          desc="Turn off to stop new dispatches without unregistering. Meetings it’s already in aren’t affected."
          checked={!next.paused}
          onCheckedChange={(on) => change({ paused: !on })}
        />
        <SwitchRow
          id="s-anyone"
          label="Anyone in meetings I host can dispatch it"
          desc="When off, only you can bring it into a meeting."
          checked={next.dispatch === "anyone"}
          onCheckedChange={(on) => change({ dispatch: on ? "anyone" : "me" })}
        />
        <SwitchRow
          id="s-auto"
          label="Join meetings automatically"
          desc={
            agent.autoJoin === "tagged"
              ? `Currently joins meetings tagged “${agent.tag ?? ""}”. Turning this off means it joins only on request.`
              : "Joins every meeting you host as soon as it starts."
          }
          checked={next.autoJoin !== "never"}
          onCheckedChange={(on) =>
            change({ autoJoin: on ? (agent.autoJoin === "tagged" ? "tagged" : "mine") : "never" })
          }
        />
        <SwitchRow
          id="s-files"
          label="Read host-only files"
          desc={
            noKnowledge
              ? "Knowledge access is off for this agent. Change it by registering again with knowledge access."
              : "Adds files the host keeps private to their agents, on top of shared meeting knowledge and the live transcript."
          }
          checked={next.knowledge === "files"}
          disabled={noKnowledge}
          onCheckedChange={(on) => change({ knowledge: on ? "files" : "shared" })}
        />
      </div>
      <SelectField
        id="s-media"
        label="In meetings it can"
        value={next.media}
        options={(Object.keys(MEDIA) as MediaMode[]).map((key) => ({
          value: key,
          label: MEDIA[key].label,
        }))}
        onValueChange={(media) => change({ media })}
      />
      <div className="flex flex-wrap items-center gap-s2">
        <Button type="submit" disabled={saving} aria-busy={saving || undefined}>
          <KmIcon name={saving ? "refresh" : "check"} className="size-4" />
          <span>{saving ? "Saving…" : "Save settings"}</span>
        </Button>
        <span aria-live="polite" className="text-sm text-muted-foreground">
          {dirty && !saving ? "Unsaved changes" : ""}
        </span>
      </div>
    </form>
  );
}

export function DetailDanger({ agent }: { readonly agent: RegistryAgent }) {
  const { removeAgent } = useAgentsState();
  const navigate = useNavigate();
  return (
    <section
      aria-labelledby="dz-title"
      className={cn(cardVariants({ variant: "panel" }), "shadow-none")}
    >
      <h2 id="dz-title" className="flex items-center gap-s2 text-xl">
        <KmIcon name="alert" className="text-red-text" />
        <span>Danger zone</span>
      </h2>
      <div className="flex flex-wrap items-start justify-between gap-s3">
        <div className="grid min-w-0 gap-0.5">
          <strong>Unregister this agent</strong>
          <p className="text-sm text-muted-foreground">
            Removes it from your registry and from every meeting’s agent list. Activity history is
            removed too.
          </p>
        </div>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive">
              <KmIcon name="trash" className="size-4" />
              <span>{`Unregister ${agent.name}`}</span>
            </Button>
          }
          title={`Unregister ${agent.name}?`}
          confirmLabel="Unregister"
          onConfirm={() => {
            removeAgent(agent.id);
            toast.add({ title: `${agent.name} unregistered` });
            void navigate({ to: "/agents", hash: "registry" });
          }}
        >
          <p>{`KnowMe will stop dispatching “${agent.worker}”. Meetings where it’s present now will lose it at their next agent refresh.`}</p>
          <p>
            Your worker keeps running on your side — stop it there if you no longer need it. You can
            register it again later.
          </p>
        </ConfirmDialog>
      </div>
    </section>
  );
}
