// TJ-ARCH-MOB-001 compliant
// #detail:<id> (agents.html `renderDetail`): glyph, crumbs, name, state line,
// role or "System agent", worker name with copy, the head action, then tabs
// (Overview, Activity, Settings, Danger zone; system agents get the first two).
// The tab starts from `?tab=` and then lives in component state.
import { Badge, BadgePip } from "@know-meet/ui/components/badge";
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { AgentGlyph } from "@know-meet/ui/components/glyph";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@know-meet/ui/components/tabs";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { copyText } from "../../shared/copy-text";
import { useDocumentTitle } from "../../shared/use-document-title";
import type { RegistryAgent } from "../domain/agent-config";
import { DetailActivity, DetailDanger, DetailOverview, DetailSettings } from "./agent-detail-tabs";
import { AgentsNotFound } from "./agents-not-found";
import { useAgentsState } from "./agents-state";
import { Crumbs, InlineCode, StateLine } from "./agents-ui";

type DetailTab = "overview" | "activity" | "settings" | "danger";

const TABS: readonly (readonly [DetailTab, string])[] = [
  ["overview", "Overview"],
  ["activity", "Activity"],
  ["settings", "Settings"],
  ["danger", "Danger zone"],
];

function DetailHead({ agent }: { readonly agent: RegistryAgent }) {
  return (
    <header className="mb-s5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s5 max-bp768:grid-cols-[auto_minmax(0,1fr)] max-bp768:gap-s4">
      <AgentGlyph tone={agent.system ? "system" : "agent"} className="w-[72px] max-bp768:w-14">
        {agent.mono}
      </AgentGlyph>
      <div className="grid min-w-0 gap-s2 *:min-w-0">
        <Crumbs items={[{ label: "Agents", to: "registry" }, { label: agent.name }]} />
        <h1 tabIndex={-1} className="block truncate text-2xl font-bold outline-none" title={agent.name}>
          {agent.name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-s4 gap-y-s2 text-sm text-muted-foreground">
          <StateLine status={agent.status}>
            {agent.status === "online" ? "Online — worker connected" : "Offline — worker not connected"}
          </StateLine>
          {agent.system ? <Badge variant="ember">System agent</Badge> : <span>{agent.role || "Agent"}</span>}
          {agent.paused ? (
            <Badge variant="amber">
              <BadgePip />
              Dispatch paused
            </Badge>
          ) : null}
          <span className="inline-flex max-w-full items-center gap-1">
            Worker <InlineCode>{agent.worker}</InlineCode>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Copy agent_name ${agent.worker}`}
              onClick={() => void copyText(agent.worker)}
            >
              <KmIcon name="copy" className="size-4" />
            </Button>
          </span>
        </div>
      </div>
      <div className="max-bp768:col-span-full">
        {agent.system ? (
          <Link to="/agents" hash="concierge" className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}>
            <KmIcon name="info" className="size-4" />
            <span>What guests get</span>
          </Link>
        ) : (
          <Link to="/meet" hash="room:agents" className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}>
            <KmIcon name="agent-add" className="size-4" />
            <span>Dispatch in a meeting</span>
          </Link>
        )}
      </div>
    </header>
  );
}

function DetailBody({ agent, initialTab }: { readonly agent: RegistryAgent; readonly initialTab: string | undefined }) {
  useDocumentTitle(`${agent.name} — Know Meet`);
  const tabs = agent.system ? TABS.slice(0, 2) : TABS;
  const [tab, setTab] = useState<DetailTab>(() => tabs.find(([key]) => key === initialTab)?.[0] ?? "overview");
  return (
    <>
      <DetailHead agent={agent} />
      <Tabs
        value={tab}
        onValueChange={(next) => {
          const key = tabs.find(([candidate]) => candidate === next)?.[0];
          if (key !== undefined) setTab(key);
        }}
        className="gap-0"
      >
        <TabsList aria-label={`${agent.name} sections`}>
          {tabs.map(([key, label]) => (
            <TabsTrigger key={key} value={key}>
              {key === "danger" ? <KmIcon name="alert" className="size-4" /> : null}
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="pt-s5">
          <DetailOverview agent={agent} />
        </TabsContent>
        <TabsContent value="activity" className="pt-s5">
          <DetailActivity agent={agent} />
        </TabsContent>
        {agent.system ? null : (
          <>
            <TabsContent value="settings" className="pt-s5">
              <DetailSettings agent={agent} />
            </TabsContent>
            <TabsContent value="danger" className="pt-s5">
              <DetailDanger agent={agent} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </>
  );
}

export function AgentDetailView({ id, params }: { readonly id: string | null; readonly params: Readonly<Record<string, string>> }) {
  const { registry } = useAgentsState();
  const agent = id === null ? undefined : registry.find((candidate) => candidate.id === id);
  if (agent === undefined) {
    return (
      <AgentsNotFound
        title="Agent not found"
        message={`No agent “${id ?? ""}” is registered to your account. It may have been unregistered, or the link is mistyped.`}
      />
    );
  }
  return <DetailBody key={agent.id} agent={agent} initialTab={params.tab} />;
}
