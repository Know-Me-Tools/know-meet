// TJ-ARCH-MOB-001 compliant
// #register:3 Permissions & knowledge (agents.html `wizStep3`): media, knowledge,
// dispatch and auto-join choice cards; the meeting tag appears only for
// "Meetings tagged…" and takes focus when that option is chosen.
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { AUTOJOIN, DISPATCH, KNOWLEDGE, MEDIA } from "../domain/agent-config";
import { validateField } from "../domain/registration";
import { ChoiceGroup, TextField } from "./agent-form-fields";
import { useAgentsState } from "./agents-state";
import { Notice } from "./agents-ui";
import { useStepForm } from "./use-step-form";
import { WIZARD_FORM_ID, WizardFrame } from "./wizard-frame";

export function WizardPermissions() {
  const { draft, updateDraft } = useAgentsState();
  const navigate = useNavigate();
  const form = useStepForm<"tag">((field, value) => validateField(field, value));
  const tagged = draft.autoJoin === "tagged";
  const focusTag = useRef(false);

  useEffect(() => {
    if (!focusTag.current) return;
    focusTag.current = false;
    document.getElementById("p-tag")?.focus();
  }, [tagged]);

  return (
    <WizardFrame step={3}>
      <form
        id={WIZARD_FORM_ID}
        ref={form.formRef}
        noValidate
        className="grid content-start gap-s5"
        onSubmit={(event) => {
          event.preventDefault();
          const valid = tagged ? form.submit({ tag: draft.tag }) : true;
          if (valid) void navigate({ to: "/agents", hash: "register:4" });
        }}
      >
        <ChoiceGroup
          name="p-media"
          legend="In meetings it can"
          columns={3}
          value={draft.media}
          options={MEDIA}
          onValueChange={(media) => updateDraft({ media })}
        />
        <ChoiceGroup
          name="p-knowledge"
          legend="Knowledge access"
          columns={3}
          value={draft.knowledge}
          options={KNOWLEDGE}
          onValueChange={(knowledge) => updateDraft({ knowledge })}
        />
        <ChoiceGroup
          name="p-dispatch"
          legend="Who may dispatch it"
          value={draft.dispatch}
          options={DISPATCH}
          onValueChange={(dispatch) => updateDraft({ dispatch })}
        />
        <ChoiceGroup
          name="p-auto"
          legend="Auto-join"
          columns={3}
          value={draft.autoJoin}
          options={AUTOJOIN}
          onValueChange={(autoJoin) => {
            focusTag.current = autoJoin === "tagged";
            updateDraft({ autoJoin });
          }}
        />
        {tagged ? (
          <div className="grid gap-s4 rounded-tile bg-surface p-s4">
            <TextField
              id="p-tag"
              label="Meeting tag"
              required
              hint="Add this tag when scheduling a meeting to bring the agent in automatically."
              error={form.errorOf("tag")}
              control={{
                value: draft.tag,
                onValueChange: (value) => {
                  const clean = value.toLowerCase();
                  updateDraft({ tag: clean.trim() });
                  form.recheck("tag", clean);
                },
                face: "mono",
                maxLength: 32,
                placeholder: "workshop",
              }}
            />
          </div>
        ) : null}
        <Notice icon="info">
          <strong>Data retention</strong>
          <span>
            While it’s in a meeting, the agent can read only the knowledge you grant here. Anything your worker stores
            lives on your infrastructure under your own retention policy. In guest meetings the live transcript is
            deleted when the meeting ends.
          </span>
        </Notice>
      </form>
    </WizardFrame>
  );
}
