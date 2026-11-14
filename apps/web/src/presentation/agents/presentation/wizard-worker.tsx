// TJ-ARCH-MOB-001 compliant
// #register:2 Worker & dispatch (agents.html `wizStep2`): LiveKit project choice,
// the managed project URL (read-only, copyable) or the user's own project URL, key
// and secret (memory only, never shown again), the agent_name, and a minimal
// Python worker that updates as the fields change.
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { copyText } from "../../shared/copy-text";
import { workerSnippet } from "../application/agents-fixtures";
import { PROJECTS } from "../domain/agent-config";
import { type DraftField, validateField } from "../domain/registration";
import { ChoiceGroup, FormNote, SecretField, TextField } from "./agent-form-fields";
import { useAgentsState } from "./agents-state";
import { InlineCode, Notice, wholeFocusClass } from "./agents-ui";
import { useStepForm } from "./use-step-form";
import { WIZARD_FORM_ID, WizardFrame } from "./wizard-frame";

type WorkerField = Extract<DraftField, "url" | "apiKey" | "apiSecret" | "agentName">;

const revealClass = "grid gap-s4 rounded-tile bg-surface p-s4";

/** km.css `.code` block: a named, focusable scroller (it scrolls sideways at narrow widths). */
export function CodeBlock({
  label,
  children,
  className,
}: {
  readonly label: string;
  readonly children: string;
  readonly className?: string;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: the <pre> is itself the scroll container; a <section> wrapper would split the scroller from the named region.
    <pre
      role="region"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling code block must be keyboard-focusable so keyboard users can scroll it (WCAG 2.1.1).
      tabIndex={0}
      aria-label={label}
      className={cn(
        "m-0 block overflow-x-auto rounded-base bg-surface px-s4 py-s3 font-mono text-13 leading-[1.6] whitespace-pre text-foreground",
        wholeFocusClass,
        className,
      )}
    >
      {children}
    </pre>
  );
}

function CopyButton({
  label,
  text,
  ariaLabel,
}: {
  readonly label: string;
  readonly text: string;
  readonly ariaLabel?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      aria-label={ariaLabel}
      onClick={() => void copyText(text)}
    >
      <KmIcon name="copy" className="size-4" />
      <span>{label}</span>
    </Button>
  );
}

export function WizardWorker() {
  const { draft, updateDraft, secrets, updateSecrets, registry, workspace } = useAgentsState();
  const navigate = useNavigate();
  const taken = registry.map((agent) => agent.worker);
  const form = useStepForm<WorkerField>((field, value) => validateField(field, value, taken));
  const managedUrl = workspace.livekit.url;
  const own = draft.project === "own";

  return (
    <WizardFrame step={2}>
      <form
        id={WIZARD_FORM_ID}
        ref={form.formRef}
        noValidate
        className="grid content-start gap-s5"
        onSubmit={(event) => {
          event.preventDefault();
          const values = own
            ? {
                url: draft.url,
                apiKey: secrets.apiKey,
                apiSecret: secrets.apiSecret,
                agentName: draft.agentName,
              }
            : { agentName: draft.agentName };
          if (form.submit(values)) void navigate({ to: "/agents", hash: "register:3" });
        }}
      >
        <FormNote />
        <ChoiceGroup
          name="lk-project"
          legend="LiveKit project"
          required
          value={draft.project}
          options={PROJECTS}
          onValueChange={(project) => updateDraft({ project })}
        />
        {own ? (
          <div className={revealClass} id="own-project">
            <TextField
              id="lk-url"
              label="Project URL"
              required
              error={form.errorOf("url")}
              control={{
                value: draft.url,
                onValueChange: (value) => {
                  updateDraft({ url: value.trim() });
                  form.recheck("url", value);
                },
                face: "mono",
                placeholder: "wss://your-project.livekit.cloud",
                inputMode: "url",
              }}
            />
            <div className="grid grid-cols-2 gap-s4 max-bp768:grid-cols-[minmax(0,1fr)]">
              <SecretField
                id="lk-key"
                label="API key"
                required
                error={form.errorOf("apiKey")}
                control={{
                  value: secrets.apiKey,
                  onValueChange: (apiKey) => {
                    updateSecrets({ apiKey });
                    form.recheck("apiKey", apiKey);
                  },
                  face: "mono",
                }}
              />
              <SecretField
                id="lk-secret"
                label="API secret"
                required
                error={form.errorOf("apiSecret")}
                control={{
                  value: secrets.apiSecret,
                  onValueChange: (apiSecret) => {
                    updateSecrets({ apiSecret });
                    form.recheck("apiSecret", apiSecret);
                  },
                  face: "mono",
                }}
              />
            </div>
            <Notice icon="shield">
              <strong>Stored server-side only</strong>
              <span>
                Your key and secret are sent to KnowMe once and kept on the server. They’re never
                shown again — afterwards you’ll only see a masked value, and you can replace them at
                any time.
              </span>
            </Notice>
          </div>
        ) : (
          <div className={revealClass} id="managed-project">
            <TextField
              id="lk-managed-url"
              label="Project URL"
              hint={
                <>
                  Run your worker with this project’s LIVEKIT_URL, LIVEKIT_API_KEY and
                  LIVEKIT_API_SECRET. Find them in{" "}
                  <Link to="/settings" hash="livekit">
                    Settings › LiveKit
                  </Link>
                  .
                </>
              }
              control={{
                value: managedUrl,
                onValueChange: () => undefined,
                readOnly: true,
                face: "mono",
              }}
              addon={<CopyButton label="Copy" text={managedUrl} ariaLabel="Copy project URL" />}
            />
          </div>
        )}
        <TextField
          id="a-agentname"
          label="agent_name"
          required
          hint={
            <>
              KnowMe dispatches your worker by this exact name. It must match{" "}
              <InlineCode>agent_name</InlineCode> in your worker’s WorkerOptions (or AgentServer).
              Lowercase letters, numbers and hyphens.
            </>
          }
          error={form.errorOf("agentName")}
          control={{
            value: draft.agentName,
            onValueChange: (value) => {
              const clean = value.toLowerCase();
              updateDraft({ agentName: clean.trim() });
              form.recheck("agentName", clean);
            },
            face: "mono",
            maxLength: 48,
            placeholder: "e.g. scribe-notes",
          }}
        />
        <div className="grid gap-s2">
          <div className="flex items-center justify-between gap-s2">
            <h2 className="text-lg">Minimal worker</h2>
            <CopyButton label="Copy code" text={workerSnippet(draft, managedUrl)} />
          </div>
          <p className="text-sm text-muted-foreground">
            Start it with <InlineCode>python worker.py start</InlineCode>. Keep it running so it can
            accept dispatches.
          </p>
          <CodeBlock label="Python worker example">{workerSnippet(draft, managedUrl)}</CodeBlock>
        </div>
      </form>
    </WizardFrame>
  );
}
