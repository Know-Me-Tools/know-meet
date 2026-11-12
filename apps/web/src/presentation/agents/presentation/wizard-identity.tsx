// TJ-ARCH-MOB-001 compliant
// #register:1 Identity (agents.html `wizStep1`): name, role, description and glyph
// letters beside a live tile preview. The glyph is suggested from the name when
// the name field is left with the glyph still empty.
import { AgentGlyph } from "@know-meet/ui/components/glyph";
import { useNavigate } from "@tanstack/react-router";
import { initialsOf } from "../../workspace/application/format";
import { type RegistrationDraft, suggestGlyph, validateField } from "../domain/registration";
import { FormNote, TextAreaField, TextField } from "./agent-form-fields";
import { useAgentsState } from "./agents-state";
import { StateLine } from "./agents-ui";
import { useStepForm } from "./use-step-form";
import { WIZARD_FORM_ID, WizardFrame } from "./wizard-frame";

type IdentityField = "name" | "role" | "desc" | "glyph";

function patchFor(field: IdentityField, value: string): Partial<RegistrationDraft> {
  switch (field) {
    case "name":
      return { name: value };
    case "role":
      return { role: value };
    case "desc":
      return { desc: value };
    case "glyph":
      return { glyph: value };
  }
}

function TilePreview() {
  const { draft } = useAgentsState();
  const glyph = (draft.glyph || (draft.name.trim() === "" ? "" : initialsOf(draft.name)) || "?")
    .slice(0, 2)
    .toUpperCase();
  return (
    <aside
      aria-labelledby="pv-title"
      className="sticky top-[calc(var(--spacing-header-h)+var(--spacing-s5))] grid min-w-0 content-start gap-s3 rounded-tile bg-surface p-s5 shadow-(--shadow-card) max-bp1024:static max-bp768:p-s4"
    >
      <h2
        id="pv-title"
        className="font-mono text-11 font-semibold tracking-eyebrow text-muted-foreground uppercase"
      >
        Tile preview
      </h2>
      <div className="grid justify-items-center gap-s3 rounded-tile bg-background px-s4 py-s6 text-center *:max-w-full">
        <AgentGlyph className="w-[84px]">{glyph}</AgentGlyph>
        <strong className="block truncate" title={draft.name}>
          {draft.name || "Agent name"}
        </strong>
        <span className="block truncate text-sm text-muted-foreground">{draft.role || "Role"}</span>
        <StateLine status="offline">Offline until its worker connects</StateLine>
      </div>
      <span className="line-clamp-3 text-sm text-muted-foreground" title={draft.desc}>
        {draft.desc || "A short description helps people decide when to dispatch it."}
      </span>
    </aside>
  );
}

export function WizardIdentity() {
  const { draft, updateDraft } = useAgentsState();
  const navigate = useNavigate();
  const form = useStepForm<IdentityField>((field, value) => validateField(field, value));

  const change = (field: IdentityField, value: string) => {
    updateDraft(patchFor(field, value));
    form.recheck(field, value);
  };

  return (
    <WizardFrame step={1}>
      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-s6 max-bp1024:grid-cols-[minmax(0,1fr)]">
        <form
          id={WIZARD_FORM_ID}
          ref={form.formRef}
          noValidate
          className="grid content-start gap-s5"
          onSubmit={(event) => {
            event.preventDefault();
            const valid = form.submit({
              name: draft.name,
              role: draft.role,
              desc: draft.desc,
              glyph: draft.glyph,
            });
            if (valid) void navigate({ to: "/agents", hash: "register:2" });
          }}
        >
          <FormNote />
          <TextField
            id="a-name"
            label="Name"
            required
            hint="Shown on the agent’s tile and in the participant list."
            error={form.errorOf("name")}
            control={{
              value: draft.name,
              onValueChange: (value) => change("name", value),
              maxLength: 40,
              placeholder: "e.g. Scribe",
              onBlur: () => {
                if (draft.glyph === "" && draft.name.trim() !== "") {
                  const glyph = suggestGlyph(draft.name);
                  if (glyph !== "") updateDraft({ glyph });
                }
              },
            }}
          />
          <TextField
            id="a-role"
            label="Role"
            error={form.errorOf("role")}
            control={{
              value: draft.role,
              onValueChange: (value) => change("role", value),
              maxLength: 40,
              placeholder: "e.g. Note-taker",
            }}
          />
          <TextAreaField
            id="a-desc"
            label="Description"
            hint="Up to 200 characters. Hosts see this when choosing agents."
            error={form.errorOf("desc")}
            value={draft.desc}
            onValueChange={(value) => change("desc", value)}
            maxLength={200}
            placeholder="What does it do in a meeting?"
          />
          <TextField
            id="a-glyph"
            label="Glyph letters"
            required
            hint="Two letters or digits shown on the tile while the agent has no video."
            error={form.errorOf("glyph")}
            control={{
              value: draft.glyph,
              onValueChange: (value) => change("glyph", value.toUpperCase()),
              maxLength: 2,
              placeholder: "SC",
              face: "mono",
            }}
          />
        </form>
        <TilePreview />
      </div>
    </WizardFrame>
  );
}
