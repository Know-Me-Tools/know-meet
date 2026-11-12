// TJ-ARCH-MOB-001 compliant
// #register-error (agents.html `renderRegisterError`): the connection test failed
// at "Worker registered with agent_name". Copy states the cause, then the fixes
// (PRODUCT.md voice; VoiceOver finding F9: no raw error codes are shown or read).
// Likely causes are a tick-off checklist; Retry re-runs the test.
import { buttonVariants } from "@know-meet/ui/components/button";
import { cardVariants } from "@know-meet/ui/components/card";
import { Checkbox } from "@know-meet/ui/components/checkbox";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useDocumentTitle } from "../../shared/use-document-title";
import { FAIL_WORKER } from "../domain/registration";
import { useAgentsState } from "./agents-state";
import { InlineCode, KeyValues, Notice } from "./agents-ui";
import { WizardFoot, WizardHead } from "./wizard-frame";

function causesFor(agentName: string, url: string): readonly (readonly [string, string])[] {
  return [
    ["The worker isn’t running", "Start it with python worker.py start and leave it running while you test."],
    ["The names don’t match", `agent_name in WorkerOptions must equal “${agentName}” exactly — it’s case-sensitive.`],
    ["It’s connected to a different project", `Check that the worker’s LIVEKIT_URL is ${url}.`],
    ["Credentials were rejected", "Make sure LIVEKIT_API_KEY and LIVEKIT_API_SECRET belong to that same project."],
    [
      "It started without agent_name",
      "Workers without agent_name are dispatched automatically to every room and can’t be called by name.",
    ],
  ];
}

export function RegisterErrorView() {
  useDocumentTitle("Connection test failed — Know Meet");
  const { lastFailure, draft, workspace } = useAgentsState();
  const managed = workspace.livekit.url;
  const failure = lastFailure ?? {
    agentName: draft.agentName || FAIL_WORKER,
    url: draft.project === "own" ? draft.url || managed : managed,
  };

  return (
    <>
      <WizardHead
        step={4}
        title="Connection test failed"
        crumbs={[
          { label: "Agents", to: "registry" },
          { label: "Register an agent", to: "register:4" },
          { label: "Test failed" },
        ]}
      />
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-s5 max-bp1024:grid-cols-[minmax(0,1fr)]">
        <section aria-labelledby="err-title" className={cardVariants({ variant: "panel" })}>
          <Notice tone="danger" icon="alert">
            <strong id="err-title">
              No worker is registered with agent_name <InlineCode>{failure.agentName}</InlineCode>.
            </strong>
            <span>
              KnowMe reached the LiveKit project, but no running worker announced that name, so there was nothing to
              dispatch. Your registration hasn’t been saved yet.
            </span>
          </Notice>
          <KeyValues
            rows={[
              ["Project", failure.url, "mono"],
              ["agent_name", failure.agentName, "mono"],
              ["Passed", "Reach LiveKit project", "plain"],
              ["Failed", "Worker registered with agent_name", "plain"],
              ["Skipped", "Test dispatch, agent response", "plain"],
            ]}
          />
        </section>
        <section aria-labelledby="causes-title" className={cardVariants({ variant: "panel" })}>
          <div>
            <h2 id="causes-title" className="text-xl">
              Likely causes
            </h2>
            <p className="text-sm text-muted-foreground">Tick each one off as you check it.</p>
          </div>
          <div className="grid content-start gap-s2">
            {causesFor(failure.agentName, failure.url).map(([title, fix]) => (
              <label
                key={title}
                className="flex min-h-11 cursor-pointer items-start gap-s3 py-s2"
              >
                <Checkbox className="mt-0.5" />
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-sm font-semibold">{title}</span>
                  <span className="text-sm text-muted-foreground">{fix}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>
      <WizardFoot>
        <div className="flex flex-wrap items-center gap-s2">
          <Link to="/agents" hash="register:4?autorun=1" className={cn(buttonVariants(), focusFillClass)}>
            <KmIcon name="refresh" className="size-4" />
            <span>Retry test</span>
          </Link>
          <Link to="/agents" hash="register:2" className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}>
            <KmIcon name="edit" className="size-4" />
            <span>Edit worker settings</span>
          </Link>
          <Link to="/agents" hash="registry" className={cn(buttonVariants({ variant: "ghost" }), focusFillClass)}>
            <span>Save for later</span>
          </Link>
        </div>
      </WizardFoot>
    </>
  );
}
