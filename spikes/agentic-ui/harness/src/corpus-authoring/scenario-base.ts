/** Shared defaults for scenario definitions. */
import type { ScenarioFile } from "../domain/scenario.ts";
import { AG_UI_CORE_PACKAGE, AG_UI_PROTOCOL_VERSION, CORPUS_FORMAT_VERSION } from "../domain/versions.ts";

type ScenarioInput = Omit<ScenarioFile, "corpusFormatVersion" | "agUiCorePackage" | "agUiProtocolVersion" | "pacing" | "interactions" | "validity"> &
  Partial<Pick<ScenarioFile, "pacing" | "interactions" | "validity">>;

export const DEFAULT_PACING = { tokensPerSecond: 120, eventGapMs: 15 } as const;

export function defineScenario(input: ScenarioInput): ScenarioFile {
  return {
    corpusFormatVersion: CORPUS_FORMAT_VERSION,
    agUiCorePackage: AG_UI_CORE_PACKAGE,
    agUiProtocolVersion: AG_UI_PROTOCOL_VERSION,
    pacing: DEFAULT_PACING,
    interactions: [],
    validity: "valid",
    ...input,
  };
}

/** The user message every transcript starts with (the prompt the check types). */
export function userTurn(prompt: string): { readonly role: "user"; readonly textEquals: string } {
  return { role: "user", textEquals: prompt };
}
