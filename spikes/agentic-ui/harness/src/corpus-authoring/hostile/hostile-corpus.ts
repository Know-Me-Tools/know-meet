/** Assembles the hostile corpus and wraps items as AG-UI scenarios (POST /agui/hostile/<id>). */
import type { HostileCorpusFile, HostileItem } from "../../domain/hostile.ts";
import type { ScenarioFile, WireItem } from "../../domain/scenario.ts";
import { CORPUS_FORMAT_VERSION } from "../../domain/versions.ts";
import { custom, runFinished, runStarted, textMessage } from "../event-builders.ts";
import { defineScenario, userTurn } from "../scenario-base.ts";
import { HTML_AND_LINK_ITEMS } from "./html-and-links.ts";
import { STREAMING_AND_MEDIA_ITEMS } from "./streaming-and-media.ts";
import { SVG_MERMAID_KATEX_ITEMS } from "./svg-mermaid-katex.ts";

export const HOSTILE_SCENARIO_PREFIX = "hostile/";
export const HOSTILE_MESSAGE_ID = "msg-hostile-1";

/** Applied to every hostile item in addition to its own forbiddenSelectors. */
export const GLOBAL_FORBIDDEN_SELECTORS = [
  "script",
  "iframe",
  "frame",
  "object",
  "embed",
  "applet",
  "base",
  "meta",
  "link[rel]",
  "form",
  "a[href^='javascript:' i]",
  "a[href^='vbscript:' i]",
  "a[href^='data:' i]",
  "[href^='javascript:' i]",
  "[src^='javascript:' i]",
  "[src*='{{EVIL_ORIGIN}}']",
  "[href*='{{EVIL_ORIGIN}}']",
] as const;

export function buildHostileCorpus(): HostileCorpusFile {
  return {
    corpusFormatVersion: CORPUS_FORMAT_VERSION,
    description:
      "Hostile markdown and media corpus. Each item is served as an AG-UI run at POST /agui/hostile/<id>. Global checks for every item: " +
      "the __kmXss sentinel is never called, no dialog opens, the page never navigates, the evil origin receives zero requests, " +
      "no element carries an on* attribute, and globalForbiddenSelectors never match inside the transcript.",
    globalForbiddenSelectors: GLOBAL_FORBIDDEN_SELECTORS,
    items: [...HTML_AND_LINK_ITEMS, ...SVG_MERMAID_KATEX_ITEMS, ...STREAMING_AND_MEDIA_ITEMS],
  };
}

export function hostileScenarioId(item: HostileItem): string {
  return `${HOSTILE_SCENARIO_PREFIX}${item.id}`;
}

export function wrapHostileAsScenario(item: HostileItem): ScenarioFile {
  const prompt = `Hostile corpus item ${item.id}.`;
  const d = item.delivery;
  const body: WireItem[] =
    d.kind === "markdown"
      ? textMessage(HOSTILE_MESSAGE_ID, d.markdown, d.chunking)
      : [...textMessage(HOSTILE_MESSAGE_ID, d.markdown), custom(d.name, d.value)];
  return defineScenario({
    id: hostileScenarioId(item),
    title: `Hostile: ${item.title}`,
    description: item.expectedOutcome,
    tags: ["@hostile", `@${item.category}`],
    userPrompt: prompt,
    pacing: { tokensPerSecond: 400, eventGapMs: 0 },
    runs: [{ trigger: { kind: "initial" }, items: [runStarted(), ...body, runFinished({ type: "success" })] }],
    expected: {
      runStatus: "finished",
      messages: [userTurn(prompt), { id: HOSTILE_MESSAGE_ID, role: "assistant", textEquals: d.markdown, status: "complete" }],
    },
  });
}
