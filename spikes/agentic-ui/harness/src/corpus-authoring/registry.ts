/** Every corpus definition, in a stable order. */
import type { GoldenSurfaceFile } from "../domain/a2ui-surface.ts";
import type { ScenarioFile } from "../domain/scenario.ts";
import { buttonActionsRoundTripSurface, formValidationSurface, incrementalUpdateDeleteSurface } from "./a2ui/surfaces-forms.ts";
import { cardWithActionSurface, listTemplateSurface, mediaSurface, nestedLayoutSurface, unknownComponentSurface } from "./a2ui/surfaces-layout.ts";
import { a2uiOverAgUiScenario } from "./scenarios/a2ui-over-agui.ts";
import { customChunksScenario } from "./scenarios/custom-chunks.ts";
import { hitlApproveScenario, hitlExpireScenario, hitlRejectScenario } from "./scenarios/hitl.ts";
import { agentCancelledScenario, cancelMidStreamScenario, disconnectReplayScenario, runErrorScenario } from "./scenarios/lifecycle.ts";
import { longMarkdownScenario } from "./scenarios/long-markdown.ts";
import { malformedOutOfOrderScenario } from "./scenarios/malformed.ts";
import { reasoningSubagentsScenario, stateSnapshotDeltaScenario } from "./scenarios/state-and-reasoning.ts";
import { parallelToolCallsScenario } from "./scenarios/tool-calls.ts";

export function allScenarios(): ScenarioFile[] {
  return [
    longMarkdownScenario(),
    parallelToolCallsScenario(),
    hitlApproveScenario(),
    hitlRejectScenario(),
    hitlExpireScenario(),
    cancelMidStreamScenario(),
    agentCancelledScenario(),
    runErrorScenario(),
    disconnectReplayScenario(),
    stateSnapshotDeltaScenario(),
    customChunksScenario(),
    a2uiOverAgUiScenario(),
    reasoningSubagentsScenario(),
    malformedOutOfOrderScenario(),
  ];
}

export function allSurfaces(): GoldenSurfaceFile[] {
  return [
    formValidationSurface(),
    listTemplateSurface(),
    cardWithActionSurface(),
    buttonActionsRoundTripSurface(),
    mediaSurface(),
    nestedLayoutSurface(),
    unknownComponentSurface(),
    incrementalUpdateDeleteSurface(),
  ];
}
