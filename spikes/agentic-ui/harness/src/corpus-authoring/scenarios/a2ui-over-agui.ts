/**
 * A2UI v1.0 delivered over AG-UI: ACTIVITY_SNAPSHOT with activityType
 * "a2ui-surface" and content { a2ui_operations: [...] }, then ACTIVITY_DELTA
 * appending an operation. The user clicks a Button; the A2UI action goes back
 * in RunAgentInput.forwardedProps.a2uiAction.userAction (assistant-ui's path),
 * and the agent answers in a continuation run.
 */
import type { ScenarioFile } from "../../domain/scenario.ts";
import { A2UI_ACTIVITY_TYPE, A2UI_BASIC_CATALOG_ID, A2UI_OPERATIONS_KEY, A2UI_SPEC_VERSION } from "../../domain/versions.ts";
import { activityDelta, activitySnapshot, runFinished, runStarted, textMessage } from "../event-builders.ts";
import { defineScenario, userTurn } from "../scenario-base.ts";

const SURFACE = "km-room-picker";
const ACTIVITY_ID = "act-a2ui-1";
const V = A2UI_SPEC_VERSION;

const OPERATIONS = [
  { version: V, createSurface: { surfaceId: SURFACE, catalogId: A2UI_BASIC_CATALOG_ID, dataModel: { room: { name: "Atlas", seats: 6 } } } },
  {
    version: V,
    updateComponents: {
      surfaceId: SURFACE,
      components: [
        { id: "root", component: "Card", child: "body" },
        { id: "body", component: "Column", children: ["heading", "seats", "book_btn"] },
        { id: "heading", component: "Text", text: { "@path": "/room/name" } },
        { id: "seats", component: "Text", text: "6 seats, screen and whiteboard" },
        {
          id: "book_btn",
          component: "Button",
          child: "book_label",
          variant: "primary",
          action: { event: { name: "book_room", context: { room: { "@path": "/room/name" }, slot: "14:00" } } },
        },
        { id: "book_label", component: "Text", text: "Book Atlas at 14:00" },
      ],
    },
  },
] as const;

const DELTA_OPERATION = { version: V, updateDataModel: { surfaceId: SURFACE, path: "/room/seats", value: 8 } } as const;
const CONFIRM_OPERATION = { version: V, updateDataModel: { surfaceId: SURFACE, path: "/room/booked", value: true } } as const;

export function a2uiOverAgUiScenario(): ScenarioFile {
  const prompt = "Find me a room for the 14:00 follow-up.";
  const intro = "Atlas is free at 14:00. You can book it here:";
  const confirm = "Booked Atlas for 14:00.";
  return defineScenario({
    id: "a2ui-over-agui",
    title: "A2UI surface over AG-UI activity, with action round-trip",
    description:
      `A2UI ${V} operations ride in ACTIVITY_SNAPSHOT (activityType "${A2UI_ACTIVITY_TYPE}", content.${A2UI_OPERATIONS_KEY}); ` +
      "an ACTIVITY_DELTA appends an updateDataModel operation. Clicking book_btn must POST a new run whose " +
      "forwardedProps.a2uiAction.userAction is the A2UI v1.0 action {name, surfaceId, sourceComponentId, timestamp, context}. " +
      "The continuation run confirms with text and a second ACTIVITY_DELTA.",
    tags: ["@a2ui", "@activity"],
    userPrompt: prompt,
    a2uiSpecVersion: V,
    runs: [
      {
        trigger: { kind: "initial" },
        items: [
          runStarted(),
          ...textMessage("msg-a2ui-1", intro),
          activitySnapshot(ACTIVITY_ID, A2UI_ACTIVITY_TYPE, { [A2UI_OPERATIONS_KEY]: OPERATIONS }),
          activityDelta(ACTIVITY_ID, A2UI_ACTIVITY_TYPE, [{ op: "add", path: `/${A2UI_OPERATIONS_KEY}/-`, value: DELTA_OPERATION }]),
          runFinished({ type: "success" }),
        ],
      },
      {
        trigger: { kind: "a2ui-action", actionName: "book_room" },
        items: [
          runStarted(),
          activityDelta(ACTIVITY_ID, A2UI_ACTIVITY_TYPE, [{ op: "add", path: `/${A2UI_OPERATIONS_KEY}/-`, value: CONFIRM_OPERATION }]),
          ...textMessage("msg-a2ui-2", confirm),
          runFinished({ type: "success" }),
        ],
      },
    ],
    interactions: [{ do: "a2ui-click", surfaceId: SURFACE, componentId: "book_btn" }],
    expected: {
      runStatus: "finished",
      noProtocolErrors: true,
      messages: [
        userTurn(prompt),
        { id: "msg-a2ui-1", role: "assistant", textEquals: intro, status: "complete" },
        { id: "msg-a2ui-2", role: "assistant", textEquals: confirm, status: "complete" },
      ],
      a2uiSurfaces: [
        {
          surfaceId: SURFACE,
          renderedComponentIds: ["root", "body", "heading", "seats", "book_btn", "book_label"],
          dataModel: { room: { name: "Atlas", seats: 8, booked: true } },
        },
      ],
      server: {
        requestCount: 2,
        a2uiActions: [{ name: "book_room", surfaceId: SURFACE, context: { room: "Atlas", slot: "14:00" } }],
      },
      dom: [{ selector: `[data-testid='km-a2ui-surface'][data-surface-id='${SURFACE}'] [data-a2ui-id='book_btn']`, count: 1 }],
    },
  });
}
