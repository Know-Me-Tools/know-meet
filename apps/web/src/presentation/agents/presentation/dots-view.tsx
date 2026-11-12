// TJ-ARCH-MOB-001 compliant
// #dots (agents.html `renderDots`): your dot (Iris), a colleague's read-only dot
// (Sol), the "bring by default" switch, and how dots differ from registered agents
// and the Concierge.
import { Badge } from "@know-meet/ui/components/badge";
import { buttonVariants } from "@know-meet/ui/components/button";
import { cardVariants } from "@know-meet/ui/components/card";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Orb } from "@know-meet/ui/components/orb";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useDocumentTitle } from "../../shared/use-document-title";
import { MEMORIES } from "../application/agents-fixtures";
import { SwitchRow } from "./agent-form-fields";
import { useAgentsState } from "./agents-state";
import { AgentsPageHead, DotStatusChip } from "./agents-ui";

const grid3Class = "grid grid-cols-3 gap-s4 max-bp1024:grid-cols-2 max-bp768:grid-cols-[minmax(0,1fr)]";
const dotCardClass = "grid-cols-[auto_minmax(0,1fr)] items-start gap-s4";

function IrisCard() {
  const { iris, forgotten } = useAgentsState();
  const memories = MEMORIES.filter((memory) => !forgotten.has(memory.id)).length;
  return (
    <article
      aria-labelledby="dot-iris"
      data-state={iris.paused ? "paused" : "listening"}
      className={cn(cardVariants({ variant: "raised" }), dotCardClass)}
    >
      <Orb className={cn("w-16", iris.paused && "animate-none opacity-45 grayscale")} />
      <div className="grid min-w-0 gap-s2">
        <div className="flex flex-wrap items-start justify-between gap-s3">
          <div className="grid min-w-0 gap-0.5">
            <h2 id="dot-iris" className="block truncate text-lg" title={iris.name}>
              {iris.name}
            </h2>
            <span className="text-sm text-muted-foreground">Your dot</span>
          </div>
          <DotStatusChip paused={iris.paused} />
        </div>
        <p className="text-sm text-muted-foreground">
          {`${iris.join === "always" ? "Joins your meetings" : "Asks before joining your meetings"} · speaks ${iris.speak === "never" ? "never" : "only when asked"} · ${memories} meeting memories`}
        </p>
        <div className="flex flex-wrap items-center gap-s2">
          <Link
            to="/agents"
            hash="dot:iris"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), focusFillClass)}
          >
            <KmIcon name="settings" className="size-4" />
            <span>{`${iris.name} settings`}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function SolCard() {
  const { workspace } = useAgentsState();
  const sol = workspace.dots.find((dot) => dot.id === "sol");
  const name = sol?.name ?? "Sol";
  const owner = sol?.owner ?? "Avery Chen";
  return (
    <article aria-labelledby="dot-sol" className={cn(cardVariants(), dotCardClass)}>
      <Orb tone="cyan" className="w-16" />
      <div className="grid min-w-0 gap-s2">
        <div className="flex flex-wrap items-start justify-between gap-s3">
          <div className="grid min-w-0 gap-0.5">
            <h2 id="dot-sol" className="text-lg">
              {name}
            </h2>
            <span className="text-sm text-muted-foreground">Avery’s dot — visible in shared meetings</span>
          </div>
          <Badge variant="locked">
            <KmIcon name="lock" />
            <span>Read-only</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {`You’ll see ${name} in meetings you share with ${owner}. Only Avery can change its settings or see its memory.`}
        </p>
      </div>
    </article>
  );
}

export function DotsView() {
  useDocumentTitle("Your dots — Know Meet");
  const { iris, updateIris } = useAgentsState();
  return (
    <>
      <AgentsPageHead
        crumbs={[{ label: "Agents", to: "registry" }, { label: "Dots" }]}
        eyebrow="Agents"
        title="Your dots"
        lede="A dot is a persistent personal agent. It keeps a private memory that only its owner can see, and it can come with you into meetings."
      />
      <section aria-label="Dots" className="grid grid-cols-[minmax(0,1fr)] gap-s4">
        <div className="grid grid-cols-2 gap-s4 max-bp768:grid-cols-[minmax(0,1fr)]">
          <IrisCard />
          <SolCard />
        </div>
        <div className={cardVariants({ variant: "panel" })}>
          <SwitchRow
            id="dots-default"
            label={`Bring ${iris.name} to meetings by default`}
            desc={
              iris.paused
                ? `${iris.name} is paused, so it won’t join until you resume it.`
                : `When off, add ${iris.name} from the Agents panel in each meeting.`
            }
            checked={iris.byDefault}
            onCheckedChange={(on) => {
              updateIris({ byDefault: on });
              toast.add({
                title: on ? `${iris.name} will join your meetings by default` : `${iris.name} joins only when you bring it`,
                type: "success",
              });
            }}
          />
        </div>
      </section>
      <section aria-labelledby="dots-how" className="mt-s7 grid grid-cols-[minmax(0,1fr)] gap-s4">
        <h2 id="dots-how" className="text-xl">
          Dots, registered agents and the Concierge
        </h2>
        <div className={grid3Class}>
          <article className={cardVariants()}>
            <h3 className="text-lg">Dots</h3>
            <p className="text-sm text-muted-foreground">
              One per person, always on. Remembers across meetings in a private memory you control and can clear.
            </p>
          </article>
          <article className={cardVariants()}>
            <h3 className="text-lg">Registered agents</h3>
            <p className="text-sm text-muted-foreground">
              LiveKit workers you run. Dispatched into a meeting by agent_name, with the permissions you set.
            </p>
            <Link to="/agents" hash="registry" className="text-sm">
              Your agents
            </Link>
          </article>
          <article className={cardVariants()}>
            <h3 className="text-lg">Concierge</h3>
            <p className="text-sm text-muted-foreground">
              Provided by KnowMe in every meeting, and the only agent guests get. Remembers nothing afterwards.
            </p>
            <Link to="/agents" hash="concierge" className="text-sm">
              About the Concierge
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}
