/** A2UI golden surfaces: forms, actions and data binding. */
import type { GoldenSurfaceFile } from "../../domain/a2ui-surface.ts";
import { defineSurface, op } from "./surface-base.ts";

export function formValidationSurface(): GoldenSurfaceFile {
  const s = "km-form-validation";
  const emailOk = { "@call": "email", args: { value: { "@path": "/form/email" } } };
  const nameOk = { "@call": "required", args: { value: { "@path": "/form/name" } } };
  const agreeOk = { "@call": "required", args: { value: { "@path": "/form/agree" } } };
  return defineSurface({
    id: "form-validation",
    title: "Invite form with renderer-side checks",
    description: "TextField checks (required, email, regex), a CheckBox, a ChoicePicker and a submit Button whose checks gate the action.",
    surfaceId: s,
    messages: [
      op.create(s, { form: { name: "", email: "", phone: "", agree: false, role: ["guest"] } }, true),
      op.components(s, [
        { id: "root", component: "Card", child: "col" },
        { id: "col", component: "Column", children: ["title", "name_field", "email_field", "phone_field", "role_picker", "agree_box", "submit_btn"], align: "stretch" },
        { id: "title", component: "Text", text: "Invite a guest" },
        { id: "name_field", component: "TextField", label: "Name", value: { "@path": "/form/name" }, checks: [{ condition: nameOk, message: "Name is required" }] },
        { id: "email_field", component: "TextField", label: "Email", value: { "@path": "/form/email" }, checks: [{ condition: emailOk, message: "Enter a valid email" }] },
        {
          id: "phone_field",
          component: "TextField",
          label: "Phone (optional)",
          value: { "@path": "/form/phone" },
          checks: [{ condition: { "@call": "regex", args: { value: { "@path": "/form/phone" }, pattern: "^(\\+?[0-9]{10,15})?$" } }, message: "Use 10-15 digits" }],
        },
        {
          id: "role_picker",
          component: "ChoicePicker",
          label: "Role",
          options: [{ label: "Guest", value: "guest" }, { label: "Co-host", value: "cohost" }],
          value: { "@path": "/form/role" },
        },
        { id: "agree_box", component: "CheckBox", label: "Guest may be recorded", value: { "@path": "/form/agree" } },
        {
          id: "submit_btn",
          component: "Button",
          child: "submit_label",
          variant: "primary",
          checks: [{ condition: { "@call": "and", args: { values: [nameOk, emailOk, agreeOk] } }, message: "Complete the form first" }],
          action: { event: { name: "invite_guest", context: { name: { "@path": "/form/name" }, email: { "@path": "/form/email" }, role: { "@path": "/form/role" } } } },
        },
        { id: "submit_label", component: "Text", text: "Send invite" },
      ]),
    ],
    interactions: [
      {
        description: "Invalid email: the action must not fire and the check message must show.",
        fill: { name_field: "Ana", email_field: "not-an-email" },
        click: "submit_btn",
        expectVisibleText: ["Enter a valid email"],
      },
      {
        description: "Valid form: the action fires with bound context.",
        fill: { name_field: "Ana", email_field: "ana@know-me.tools" },
        toggle: ["agree_box"],
        click: "submit_btn",
        expectAction: { name: "invite_guest", sourceComponentId: "submit_btn", context: { name: "Ana", email: "ana@know-me.tools", role: ["guest"] } },
      },
    ],
    expected: {
      renderedComponentIds: ["root", "col", "title", "name_field", "email_field", "phone_field", "role_picker", "agree_box", "submit_btn", "submit_label"],
      fallbackComponentIds: [],
      visibleText: ["Invite a guest", "Name", "Email", "Send invite"],
      blockedMediaUrls: [],
    },
    flutterNotes: "a2ui_flutter must evaluate the same checks client-side; compare the visible error text and that no action is emitted on the invalid click.",
  });
}

export function buttonActionsRoundTripSurface(): GoldenSurfaceFile {
  const s = "km-recording-consent";
  return defineSurface({
    id: "button-actions-roundtrip",
    title: "Two buttons, distinct actions, context from data binding",
    description: "Accept and decline actions carry static and bound context. Over AG-UI the agent answers with updateDataModel, which must re-render the status text.",
    surfaceId: s,
    messages: [
      op.create(s, { meeting: { id: "m-981", title: "Pricing sync" }, consent: "pending" }),
      op.components(s, [
        { id: "root", component: "Column", children: ["question", "status", "buttons"] },
        { id: "question", component: "Text", text: { "@call": "formatString", args: { value: "Record ${/meeting/title}?" } } },
        { id: "status", component: "Text", text: { "@path": "/consent" } },
        { id: "buttons", component: "Row", children: ["accept_btn", "decline_btn"], justify: "start" },
        { id: "accept_btn", component: "Button", child: "accept_label", variant: "primary", action: { event: { name: "consent_accept", context: { meetingId: { "@path": "/meeting/id" }, scope: "audio+video" } } } },
        { id: "accept_label", component: "Text", text: "Allow recording" },
        { id: "decline_btn", component: "Button", child: "decline_label", variant: "borderless", action: { event: { name: "consent_decline", context: { meetingId: { "@path": "/meeting/id" } } } } },
        { id: "decline_label", component: "Text", text: "Don't record" },
      ]),
    ],
    interactions: [
      { description: "Accept", click: "accept_btn", expectAction: { name: "consent_accept", sourceComponentId: "accept_btn", context: { meetingId: "m-981", scope: "audio+video" } } },
      { description: "Decline", click: "decline_btn", expectAction: { name: "consent_decline", sourceComponentId: "decline_btn", context: { meetingId: "m-981" } } },
    ],
    expected: {
      renderedComponentIds: ["root", "question", "status", "buttons", "accept_btn", "accept_label", "decline_btn", "decline_label"],
      fallbackComponentIds: [],
      visibleText: ["Record Pricing sync?", "pending", "Allow recording", "Don't record"],
      blockedMediaUrls: [],
    },
    flutterNotes: "Compare the emitted action JSON (name, sourceComponentId, context) byte-for-byte after key sorting; timestamp is excluded.",
  });
}

export function incrementalUpdateDeleteSurface(): GoldenSurfaceFile {
  const s = "km-live-poll";
  return defineSurface({
    id: "incremental-update-delete",
    title: "Incremental data-model updates, component replacement, then deleteSurface",
    description: "Data model set at root, patched by path, a component replaced by a second updateComponents, then the surface deleted.",
    surfaceId: s,
    messages: [
      op.create(s),
      op.components(s, [
        { id: "root", component: "Column", children: ["q", "votes_yes", "votes_no"] },
        { id: "q", component: "Text", text: "Ship the hybrid runtime?" },
        { id: "votes_yes", component: "Text", text: { "@call": "formatString", args: { value: "Yes: ${/votes/yes}" } } },
        { id: "votes_no", component: "Text", text: { "@call": "formatString", args: { value: "No: ${/votes/no}" } } },
      ]),
      op.data(s, "/", { votes: { yes: 0, no: 0 } }),
      op.data(s, "/votes/yes", 3),
      op.data(s, "/votes/no", 1),
      op.components(s, [{ id: "q", component: "Text", text: "Ship the hybrid runtime? (closed)" }]),
      op.remove(s),
    ],
    interactions: [],
    expected: {
      renderedComponentIds: [],
      fallbackComponentIds: [],
      visibleText: [],
      blockedMediaUrls: [],
      dataModel: { votes: { yes: 3, no: 1 } },
      deleted: true,
    },
    flutterNotes: "Assert intermediate frames too: after message 5 the texts read 'Yes: 3' and 'No: 1'; after message 6 the question ends with '(closed)'; after message 7 the surface is gone.",
  });
}
