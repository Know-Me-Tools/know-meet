// TJ-ARCH-MOB-001 compliant
// c11 task 11.2: the agents screen (docs/design/prototype/agents.html, reference
// revision v2). Static UI only: no agentic runtime, no network (task 8.3 waits on
// the c16 gates). Sub-states are URL hashes (app-state-map.json):
//   #registry (default) · #register:1..4 · #register-error · #detail:<id>
//   #concierge (public) · #dots · #dot:<id>
// Every view except #concierge needs a signed-in session (km-auth); without one it
// renders its page head and the sign-in gate (agents.gate-signed-out).
import { Toaster } from "@know-meet/ui/components/toast";
import { ScreenPage } from "../../shared/screen-page";
import { useSessionUser } from "../../shared/session";
import { type HashRoute, useHashRoute } from "../../shared/use-hash-route";
import { AgentDetailView } from "./agent-detail-view";
import { AgentsGate } from "./agents-gate";
import { AgentsNotFound } from "./agents-not-found";
import { AgentsStateProvider } from "./agents-state";
import { ConciergeView } from "./concierge-view";
import { DotView } from "./dot-view";
import { DotsView } from "./dots-view";
import { RegisterErrorView } from "./register-error-view";
import { RegistryView } from "./registry-view";
import { WizardIdentity } from "./wizard-identity";
import { WizardPermissions } from "./wizard-permissions";
import { WizardTest } from "./wizard-test";
import { WizardWorker } from "./wizard-worker";

/** Title each account-only view shows in its signed-out gate (agents.html `gated`). */
function gateTitleFor(route: HashRoute): string {
  switch (route.view) {
    case "register":
      return "Register an agent";
    case "register-error":
      return "Connection test failed";
    case "detail":
      return "Agent details";
    case "dots":
      return "Your dots";
    case "dot":
      return route.arg === "iris" ? "Iris" : "Dot settings";
    default:
      return "Agents";
  }
}

function WizardStepView({
  arg,
  params,
}: {
  readonly arg: string | null;
  readonly params: HashRoute["params"];
}) {
  const step = Number.parseInt(arg ?? "", 10);
  if (step === 2) return <WizardWorker />;
  if (step === 3) return <WizardPermissions />;
  if (step === 4) return <WizardTest autorun={params.autorun === "1"} />;
  return <WizardIdentity />;
}

function DotRoute({ id }: { readonly id: string | null }) {
  if (id === "iris") return <DotView />;
  if (id === "sol") {
    return (
      <AgentsNotFound
        title="Sol is Avery’s dot"
        message="Only Avery Chen can open Sol’s settings and memory. You’ll see Sol in meetings you share with Avery."
      />
    );
  }
  return (
    <AgentsNotFound
      title="Dot not found"
      message={`You have one dot, Iris. There’s no dot called “${id ?? ""}”.`}
    />
  );
}

function SignedInView({ route }: { readonly route: HashRoute }) {
  switch (route.view) {
    case "register":
      return <WizardStepView arg={route.arg} params={route.params} />;
    case "register-error":
      return <RegisterErrorView />;
    case "detail":
      return <AgentDetailView id={route.arg} params={route.params} />;
    case "dots":
      return <DotsView />;
    case "dot":
      return <DotRoute id={route.arg} />;
    default:
      return <RegistryView params={route.params} />;
  }
}

function AgentsRoutes() {
  const route = useHashRoute();
  const signedIn = useSessionUser() !== null;
  // Remount per sub-state so each view starts from its own initial state.
  const key = `${route.view}:${route.arg ?? ""}`;
  if (route.view === "concierge") return <ConciergeView key={key} />;
  if (!signedIn) {
    return (
      <AgentsGate
        key={key}
        title={gateTitleFor(route)}
        next={`agents#${route.view || "registry"}${route.arg === null ? "" : `:${route.arg}`}`}
      />
    );
  }
  return <SignedInView key={key} route={route} />;
}

export function AgentsScreen() {
  return (
    <AgentsStateProvider>
      <Toaster>
        <ScreenPage>
          <AgentsRoutes />
        </ScreenPage>
      </Toaster>
    </AgentsStateProvider>
  );
}
