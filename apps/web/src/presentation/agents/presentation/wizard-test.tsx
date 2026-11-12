// TJ-ARCH-MOB-001 compliant
// #register:4 Test & finish (agents.html `wizStep4`): unresolved fields from steps
// 1–3 as blockers (with a link to fix each), a summary per step, and a simulated
// connection test (static UI, no network: four timed checks; the sample worker
// "missing-worker" fails check 2 and opens #register-error). `?autorun=1` starts it.
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { cardVariants } from "@know-meet/ui/components/card";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useEffectEvent, useRef, useState } from "react";
import type * as React from "react";
import { agentFromDraft } from "../application/agents-fixtures";
import { AUTOJOIN, DISPATCH, KNOWLEDGE, MEDIA, type RegistryAgent } from "../domain/agent-config";
import { draftErrors, FAIL_WORKER, FIELD_LABEL } from "../domain/registration";
import { useAgentsState } from "./agents-state";
import { Masked, NotSet, Notice } from "./agents-ui";
import { type CheckSpec, type CheckState, TestChecks } from "./test-checks";
import { WizardFrame } from "./wizard-frame";

const STEP_MS = 900;

type Row = readonly [string, React.ReactNode, "mono" | "plain"];

function SummaryCard({ title, step, rows }: { readonly title: string; readonly step: 1 | 2 | 3; readonly rows: readonly Row[] }) {
  return (
    <section aria-labelledby={`sum-${step}`} className={cn(cardVariants(), "gap-s2")}>
      <div className="flex flex-wrap items-start justify-between gap-s3">
        <h2 id={`sum-${step}`} className="text-lg">
          {title}
        </h2>
        <Link
          to="/agents"
          hash={`register:${step}`}
          aria-label={`Edit ${title}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), focusFillClass)}
        >
          <KmIcon name="edit" className="size-4" />
          <span>Edit</span>
        </Link>
      </div>
      <dl className="m-0 grid grid-cols-[minmax(0,1fr)] gap-0.5">
        {rows.map(([term, value, face], index) => (
          <Fragment key={term}>
            <dt className={cn("pt-0.5 text-sm text-muted-foreground", index > 0 && "mt-s2")}>{term}</dt>
            <dd className={cn("m-0 min-w-0 [overflow-wrap:anywhere]", face === "mono" ? "font-mono text-13" : "text-sm")}>
              {value === "" ? <NotSet /> : value}
            </dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}

function SuccessPanel({ agent, onAnother }: { readonly agent: RegistryAgent; readonly onAnother: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <div className="grid gap-s3 rounded-tile bg-green-soft p-s5">
      <h2 ref={headingRef} tabIndex={-1} className="flex items-center gap-s2 text-xl outline-none">
        <KmIcon name="check" className="text-green-text" />
        <span>Registered</span>
      </h2>
      <p>{`${agent.name} is ready. Dispatch it from the Agents panel in any meeting you host, or let its auto-join rule bring it in.`}</p>
      <div className="flex flex-wrap items-center gap-s2">
        <Link
          to="/agents"
          hash={`detail:${encodeURIComponent(agent.id)}`}
          className={cn(buttonVariants(), focusFillClass)}
        >
          <span>View agent</span>
          <KmIcon name="chevron-right" className="size-4" />
        </Link>
        <Button type="button" variant="secondary" onClick={onAnother}>
          <KmIcon name="plus" className="size-4" />
          <span>Register another</span>
        </Button>
      </div>
    </div>
  );
}

export function WizardTest({ autorun }: { readonly autorun: boolean }) {
  const state = useAgentsState();
  const { draft, secrets, registry, workspace, userName } = state;
  const navigate = useNavigate();
  const errors = draftErrors(draft, secrets, registry.map((agent) => agent.worker));
  const url = draft.project === "own" ? draft.url : workspace.livekit.url;
  const checks: readonly CheckSpec[] = [
    { title: "Reach LiveKit project", detail: url },
    { title: "Worker registered with agent_name", detail: `Looking for “${draft.agentName || "—"}”` },
    { title: "Test dispatch into sandbox room", detail: "Private room, no participants other than the agent" },
    { title: "Agent joined & responded", detail: "Waits for the agent to join and answer a test message" },
  ];
  const [states, setStates] = useState<readonly CheckState[]>(() => checks.map(() => "waiting"));
  const [running, setRunning] = useState(false);
  const [registered, setRegistered] = useState<RegistryAgent | null>(null);
  const [live, setLive] = useState(
    errors.length > 0 ? "Fix the items above to run the test." : "Runs four checks against your worker. Takes a few seconds.",
  );
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const later = (fn: () => void) => {
    timers.current.push(window.setTimeout(fn, STEP_MS));
  };
  const setCheck = (index: number, value: CheckState) =>
    setStates((current) => current.map((s, i) => (i === index ? value : s)));

  const run = () => {
    const failAt = draft.agentName === FAIL_WORKER ? 1 : -1;
    setRunning(true);
    setStates(checks.map(() => "waiting"));
    const step = (index: number) => {
      const spec = checks[index];
      if (spec === undefined) {
        const agent = agentFromDraft(draft, userName);
        state.addAgent(agent);
        state.resetDraft();
        setRunning(false);
        setRegistered(agent);
        setLive(`All four checks passed. ${agent.name} is registered.`);
        toast.add({ title: `${agent.name} registered`, type: "success" });
        return;
      }
      setCheck(index, "running");
      setLive(`Checking: ${spec.title}…`);
      later(() => {
        if (index !== failAt) {
          setCheck(index, "passed");
          step(index + 1);
          return;
        }
        setStates((current) => current.map((s, i) => (i === index ? "failed" : i > index ? "skipped" : s)));
        setLive(`Failed: no worker registered with agent_name “${draft.agentName}”. Opening details…`);
        state.setLastFailure({ agentName: draft.agentName, url });
        later(() => void navigate({ to: "/agents", hash: "register-error" }));
      });
    };
    step(0);
  };

  // Autorun once per visit to #register:4?autorun=1 (re-entrant under StrictMode:
  // the cleanup cancels the pending checks and the re-run starts them afresh).
  const startRun = useEffectEvent(run);
  const canRun = errors.length === 0;
  useEffect(() => {
    if (!autorun || !canRun) return undefined;
    startRun();
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [autorun, canRun]);

  const own = draft.project === "own";
  return (
    <WizardFrame step={4}>
      <div className="grid content-start gap-s4">
        {errors.length > 0 ? (
          <Notice tone="warn" icon="alert">
            <strong>Finish these before testing</strong>
            <ul className="m-0 grid list-none gap-s2 p-0">
              {errors.map((error) => (
                <li key={error.field} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-s2 text-sm">
                  <KmIcon name="alert" className="mt-px size-[18px] text-red-text" />
                  <span>
                    {`${FIELD_LABEL[error.field]}: ${error.message} `}
                    <Link to="/agents" hash={`register:${error.step}`}>{`Fix in step ${error.step}`}</Link>
                  </span>
                </li>
              ))}
            </ul>
          </Notice>
        ) : null}
        <div className="grid grid-cols-3 gap-s3 max-bp1024:grid-cols-[minmax(0,1fr)]">
          <SummaryCard
            title="Identity"
            step={1}
            rows={[["Name", draft.name, "plain"], ["Role", draft.role, "plain"], ["Glyph", draft.glyph, "mono"]]}
          />
          <SummaryCard
            title="Worker & dispatch"
            step={2}
            rows={[
              ["Project", own ? "My own LiveKit project" : "KnowMe-managed", "plain"],
              ["URL", url, "mono"],
              ["agent_name", draft.agentName, "mono"],
              ...(own
                ? ([
                    ["API key", secrets.apiKey === "" ? "" : <Masked />, "plain"],
                    ["API secret", secrets.apiSecret === "" ? "" : <Masked />, "plain"],
                  ] as const)
                : []),
            ]}
          />
          <SummaryCard
            title="Permissions"
            step={3}
            rows={[
              ["Media", MEDIA[draft.media].label, "plain"],
              ["Knowledge", KNOWLEDGE[draft.knowledge].label, "plain"],
              ["Dispatch", DISPATCH[draft.dispatch].label, "plain"],
              [
                "Auto-join",
                draft.autoJoin === "tagged" ? `Meetings tagged “${draft.tag || "—"}”` : AUTOJOIN[draft.autoJoin].label,
                "plain",
              ],
            ]}
          />
        </div>
        <section aria-labelledby="test-title" className={cardVariants({ variant: "panel" })}>
          <div className="flex flex-wrap items-start justify-between gap-s3">
            <div className="grid min-w-0 gap-0.5">
              <h2 id="test-title" className="text-xl">
                Connection test
              </h2>
              <p className="text-sm text-muted-foreground">
                Confirms KnowMe can reach your project and dispatch your worker by agent_name.
              </p>
            </div>
            {registered === null ? (
              <Button type="button" disabled={errors.length > 0 || running} onClick={run}>
                <KmIcon name="bolt" className="size-4" />
                <span>{running ? "Testing…" : "Run connection test"}</span>
              </Button>
            ) : null}
          </div>
          <TestChecks checks={checks} states={states} />
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {live}
          </p>
          {registered === null ? null : (
            <SuccessPanel
              agent={registered}
              onAnother={() => {
                state.resetDraft();
                void navigate({ to: "/agents", hash: "register:1" });
              }}
            />
          )}
        </section>
      </div>
    </WizardFrame>
  );
}
