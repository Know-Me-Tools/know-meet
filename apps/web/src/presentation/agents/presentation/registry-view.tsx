// TJ-ARCH-MOB-001 compliant
// #registry (agents.html `renderRegistry`): search + status filter, "Your agents",
// "System agents" and "Your dots". Filters start from the hash params (?q=,
// ?status=) and then live in component state, so typing never moves focus.

import { Button, buttonVariants } from "@know-meet/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@know-meet/ui/components/empty";
import { AgentGlyph } from "@know-meet/ui/components/glyph";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Orb } from "@know-meet/ui/components/orb";
import { ToggleGroup, ToggleGroupItem } from "@know-meet/ui/components/toggle-group";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useDocumentTitle } from "../../shared/use-document-title";
import { activityFor, lastDispatchedText } from "../application/agents-fixtures";
import type { RegistryAgent } from "../domain/agent-config";
import { useAgentsState } from "./agents-state";
import {
  AgentsPageHead,
  DotStatusChip,
  InlineCode,
  listRowClass,
  RowChevron,
  rowTrailClass,
  SectionHead,
  StatusChip,
} from "./agents-ui";

type StatusFilter = "all" | "online" | "offline";
const STATUS_FILTERS: readonly (readonly [StatusFilter, string])[] = [
  ["all", "All"],
  ["online", "Online"],
  ["offline", "Offline"],
];

function toStatus(value: string | undefined): StatusFilter {
  return STATUS_FILTERS.find(([key]) => key === value)?.[0] ?? "all";
}

function matches(agent: RegistryAgent, status: StatusFilter, needle: string): boolean {
  if (status !== "all" && agent.status !== status) return false;
  if (needle === "") return true;
  return [agent.name, agent.role, agent.worker, agent.owner, agent.desc]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function AgentRow({ agent }: { readonly agent: RegistryAgent }) {
  const { workspace, now } = useAgentsState();
  return (
    <Link to="/agents" hash={`detail:${encodeURIComponent(agent.id)}`} className={listRowClass}>
      <AgentGlyph size="sm" tone={agent.system ? "system" : "agent"}>
        {agent.mono}
      </AgentGlyph>
      <span className="grid min-w-0 gap-0.5">
        <span className="block truncate font-semibold" title={agent.name}>
          {agent.name + (agent.role === "" ? "" : ` · ${agent.role}`)}
        </span>
        <span className="flex flex-wrap gap-x-s3 gap-y-0.5 text-sm text-muted-foreground *:min-w-0 *:[overflow-wrap:anywhere]">
          <span>
            Worker <InlineCode>{agent.worker}</InlineCode>
          </span>
          <span>{lastDispatchedText(activityFor(agent.id, workspace), now)}</span>
          <span>{`Owner: ${agent.owner}`}</span>
        </span>
      </span>
      <span className={rowTrailClass}>
        <StatusChip status={agent.status} />
        <RowChevron />
      </span>
    </Link>
  );
}

function RegisterLink() {
  return (
    <Link to="/agents" hash="register:1" className={cn(buttonVariants(), focusFillClass)}>
      <KmIcon name="plus" />
      <span>Register an agent</span>
    </Link>
  );
}

function YourAgents({
  mine,
  shown,
  onClear,
}: {
  readonly mine: readonly RegistryAgent[];
  readonly shown: readonly RegistryAgent[];
  readonly onClear: () => void;
}) {
  if (mine.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <KmIcon name="agent-add" />
        </EmptyMedia>
        <EmptyTitle>No registered agents yet</EmptyTitle>
        <EmptyDescription>
          Register a LiveKit Agents worker by its agent_name and you can dispatch it into any
          meeting you host.
        </EmptyDescription>
        <RegisterLink />
      </Empty>
    );
  }
  if (shown.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <KmIcon name="filter" />
        </EmptyMedia>
        <EmptyTitle>No agents match these filters</EmptyTitle>
        <EmptyDescription>
          Try a different name, role or worker name, or show agents in every status.
        </EmptyDescription>
        <EmptyContent>
          <Button type="button" variant="secondary" onClick={onClear}>
            <KmIcon name="x" className="size-4" />
            <span>Clear filters</span>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  return (
    <div className="grid gap-s2">
      {shown.map((agent) => (
        <AgentRow key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

function DotsSection() {
  const { iris } = useAgentsState();
  return (
    <section aria-labelledby="sec-dots" className="mt-s7 grid grid-cols-[minmax(0,1fr)] gap-s4">
      <SectionHead
        id="sec-dots"
        title="Your dots"
        sub="Persistent personal agents with private memory."
        action={
          <Link
            to="/agents"
            hash="dots"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), focusFillClass)}
          >
            <span>Manage dots</span>
            <KmIcon name="chevron-right" className="size-4" />
          </Link>
        }
      />
      <div className="grid gap-s2">
        <Link
          to="/agents"
          hash="dot:iris"
          className={listRowClass}
          data-state={iris.paused ? "paused" : "listening"}
        >
          <Orb className={cn("w-10", iris.paused && "animate-none opacity-45 grayscale")} />
          <span className="grid min-w-0 gap-0.5">
            <span className="block truncate font-semibold">{iris.name}</span>
            <span className="block text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {`Your dot · private memory · ${iris.byDefault ? "joins your meetings by default" : "joins when you bring it"}`}
            </span>
          </span>
          <span className={rowTrailClass}>
            <DotStatusChip paused={iris.paused} />
            <RowChevron />
          </span>
        </Link>
      </div>
    </section>
  );
}

export function RegistryView({ params }: { readonly params: Readonly<Record<string, string>> }) {
  useDocumentTitle("Agents — Know Meet");
  const { registry } = useAgentsState();
  const [query, setQuery] = useState(() => (params.q ?? "").slice(0, 80));
  const [status, setStatus] = useState<StatusFilter>(() => toStatus(params.status));
  const searchRef = useRef<HTMLInputElement>(null);

  const needle = query.trim().toLowerCase();
  const mine = registry.filter((agent) => !agent.system);
  const mineShown = mine.filter((agent) => matches(agent, status, needle));
  const systemShown = registry.filter((agent) => agent.system && matches(agent, status, needle));
  const filtering = needle !== "" || status !== "all";
  const total = mineShown.length + systemShown.length;
  const count = filtering
    ? `${total} ${total === 1 ? "agent matches" : "agents match"}`
    : `${mine.length + systemShown.length} agents`;

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    searchRef.current?.focus();
  };

  return (
    <>
      <AgentsPageHead
        eyebrow="Agents"
        title="Agents"
        lede="LiveKit Agents workers you can dispatch into your meetings by their agent_name, plus your dots. All of this is optional — every meeting already has the Concierge."
        actions={<RegisterLink />}
      />
      <div className="mb-s5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-s4 max-bp768:grid-cols-[minmax(0,1fr)]">
        <div className="grid gap-1.5">
          <label htmlFor="agent-search" className="text-sm font-semibold">
            Search agents
          </label>
          <div className="relative">
            <KmIcon
              name="search"
              className="pointer-events-none absolute top-1/2 left-[14px] z-10 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={searchRef}
              id="agent-search"
              type="search"
              placeholder="Name, role, worker or owner"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-11"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <span id="status-label" className="text-sm font-semibold">
            Status
          </span>
          <ToggleGroup
            aria-labelledby="status-label"
            value={[status]}
            onValueChange={(values) => {
              const next = values.find((value): value is StatusFilter =>
                STATUS_FILTERS.some(([key]) => key === value),
              );
              if (next !== undefined) setStatus(next);
            }}
          >
            {STATUS_FILTERS.map(([key, label]) => (
              <ToggleGroupItem key={key} value={key}>
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
      <p aria-live="polite" className="min-h-[1.5em] text-sm text-muted-foreground">
        {count}
      </p>
      <section aria-labelledby="sec-yours" className="grid grid-cols-[minmax(0,1fr)] gap-s4">
        <SectionHead
          id="sec-yours"
          title="Your agents"
          sub="Registered workers you can dispatch. Status reflects whether the worker is connected to LiveKit right now."
        />
        <YourAgents mine={mine} shown={mineShown} onClear={clearFilters} />
      </section>
      <section aria-labelledby="sec-system" className="mt-s7 grid grid-cols-[minmax(0,1fr)] gap-s4">
        <SectionHead
          id="sec-system"
          title="System agents"
          sub="Provided by KnowMe. Always available, including to guests."
          action={
            <Link
              to="/agents"
              hash="concierge"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), focusFillClass)}
            >
              <KmIcon name="info" className="size-4" />
              <span>What guests get</span>
            </Link>
          }
        />
        <div className="grid gap-s2">
          {systemShown.length > 0 ? (
            systemShown.map((agent) => <AgentRow key={agent.id} agent={agent} />)
          ) : (
            <p className="text-sm text-muted-foreground">
              The Concierge doesn’t match these filters.
            </p>
          )}
        </div>
      </section>
      <DotsSection />
    </>
  );
}
