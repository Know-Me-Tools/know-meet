/**
 * Wraps a golden A2UI surface into an AG-UI scenario so the web prototypes
 * receive it on their single input path (served at POST /agui/a2ui/<surface-id>).
 */
import type { GoldenSurfaceFile } from "../../domain/a2ui-surface.ts";
import type { ScenarioFile, ScenarioRun } from "../../domain/scenario.ts";
import { A2UI_ACTIVITY_TYPE, A2UI_OPERATIONS_KEY } from "../../domain/versions.ts";
import { activityDelta, activitySnapshot, runFinished, runStarted, textMessage } from "../event-builders.ts";
import { defineScenario, userTurn } from "../scenario-base.ts";

export const A2UI_SCENARIO_PREFIX = "a2ui/";

export function a2uiScenarioId(surface: GoldenSurfaceFile): string {
  return `${A2UI_SCENARIO_PREFIX}${surface.id}`;
}

function actionRuns(surface: GoldenSurfaceFile, activityId: string): ScenarioRun[] {
  const names = new Set<string>();
  for (const interaction of surface.interactions) {
    if (interaction.expectAction !== undefined) names.add(interaction.expectAction.name);
  }
  return [...names].map((name) => ({
    trigger: { kind: "a2ui-action", actionName: name },
    items: [
      runStarted(),
      activityDelta(activityId, A2UI_ACTIVITY_TYPE, [
        {
          op: "add",
          path: `/${A2UI_OPERATIONS_KEY}/-`,
          value: { version: surface.a2uiSpecVersion, updateDataModel: { surfaceId: surface.surfaceId, path: "/lastAction", value: name } },
        },
      ]),
      ...textMessage(`msg-a2ui-ack-${name}`, `Received action ${name}.`),
      runFinished({ type: "success" }),
    ],
  }));
}

export function wrapSurfaceAsScenario(surface: GoldenSurfaceFile): ScenarioFile {
  const prompt = `Show the ${surface.title} surface.`;
  const intro = `Here is the ${surface.id} surface.`;
  const activityId = `act-${surface.id}`;
  const expectedSurface = {
    surfaceId: surface.surfaceId,
    renderedComponentIds: surface.expected.renderedComponentIds,
    fallbackComponentIds: surface.expected.fallbackComponentIds,
    ...(surface.expected.deleted === undefined ? {} : { deleted: surface.expected.deleted }),
  };
  return defineScenario({
    id: a2uiScenarioId(surface),
    title: `A2UI golden surface: ${surface.title}`,
    description: `${surface.description} Delivered as one ACTIVITY_SNAPSHOT (activityType "${A2UI_ACTIVITY_TYPE}").`,
    tags: ["@a2ui", "@golden-surface"],
    userPrompt: prompt,
    a2uiSpecVersion: surface.a2uiSpecVersion,
    runs: [
      {
        trigger: { kind: "initial" },
        items: [
          runStarted(),
          ...textMessage("msg-a2ui-intro", intro),
          activitySnapshot(activityId, A2UI_ACTIVITY_TYPE, { [A2UI_OPERATIONS_KEY]: surface.messages }),
          runFinished({ type: "success" }),
        ],
      },
      ...actionRuns(surface, activityId),
    ],
    expected: {
      runStatus: "finished",
      noProtocolErrors: true,
      messages: [userTurn(prompt), { id: "msg-a2ui-intro", role: "assistant", textEquals: intro, status: "complete" }],
      a2uiSurfaces: [expectedSurface],
    },
  });
}
