/** Long markdown answer (~5k tokens) streamed at a high rate. */
import type { ScenarioFile } from "../../domain/scenario.ts";
import { runFinished, runStarted, textMessage } from "../event-builders.ts";
import { defineScenario, userTurn } from "../scenario-base.ts";
import { estimateTokens } from "../tokenize.ts";

const TARGET_TOKENS = 5000;

const TOPICS = [
  "Decisions",
  "Open questions",
  "Action items",
  "Risks",
  "Dependencies",
  "Timeline",
  "Customer feedback",
  "Metrics",
] as const;

function section(index: number): string {
  const topic = TOPICS[index % TOPICS.length] ?? "Notes";
  const n = index + 1;
  return [
    `## ${n}. ${topic} (part ${Math.floor(index / TOPICS.length) + 1})`,
    "",
    `The team reviewed **${topic.toLowerCase()}** for workstream ${n}. Discussion covered the trade-offs between ` +
      `shipping the *hybrid* runtime first and keeping the reducer in-house, with \`entity-graph\` as the durable store. ` +
      `Participants agreed to keep AG-UI and A2UI as the only wire contracts and to measure before deciding.`,
    "",
    `- Owner: participant ${(n % 5) + 1}, due in ${(n % 9) + 2} days`,
    `- Status: ${n % 3 === 0 ? "blocked" : n % 3 === 1 ? "in progress" : "done"}`,
    `  - Follow-up: confirm the ${topic.toLowerCase()} list with the Concierge`,
    `  - Link: [meeting memory ${n}](https://know-me.tools/meet/notes/${n})`,
    "",
    `| Item | Owner | Estimate | Confidence |`,
    `| --- | --- | ---: | :---: |`,
    `| ${topic} review | P${(n % 5) + 1} | ${n * 2}h | ${n % 2 === 0 ? "high" : "medium"} |`,
    `| Spike follow-up ${n} | P${((n + 2) % 5) + 1} | ${n + 3}h | low |`,
    "",
    "```ts",
    `export const workstream${n} = { topic: "${topic}", estimateHours: ${n * 2}, blocked: ${n % 3 === 0} };`,
    "```",
    "",
    `> Quote ${n}: "We should not ship anything we have not measured inside the Tauri webview."`,
    "",
    `Inline math for the estimate: $h_{${n}} = ${n} \\times 2$.`,
    "",
  ].join("\n");
}

export function buildLongMarkdownText(): string {
  const parts = ["# Meeting summary: agentic UI spike review", "", "This is a long, deliberately varied answer used to measure streaming cost.", ""];
  let index = 0;
  while (estimateTokens(parts.join("\n")) < TARGET_TOKENS) {
    parts.push(section(index));
    index += 1;
  }
  parts.push("That concludes the summary.");
  return parts.join("\n");
}

export function longMarkdownScenario(): ScenarioFile {
  const prompt = "Summarise the whole meeting in detail.";
  const text = buildLongMarkdownText();
  return defineScenario({
    id: "long-markdown",
    title: "Long markdown answer at a high token rate",
    description:
      `One assistant message of about ${estimateTokens(text)} tokens (${text.length} chars) with headings, ` +
      "nested lists, GFM tables, fenced code, block quotes, links and inline math, streamed one word per delta.",
    tags: ["@streaming", "@performance", "@a11y"],
    userPrompt: prompt,
    pacing: { tokensPerSecond: 600, eventGapMs: 0 },
    runs: [{ trigger: { kind: "initial" }, items: [runStarted(), ...textMessage("msg-long-1", text), runFinished({ type: "success" })] }],
    expected: {
      runStatus: "finished",
      noProtocolErrors: true,
      messages: [userTurn(prompt), { id: "msg-long-1", role: "assistant", textEquals: text, status: "complete" }],
      dom: [
        { selector: "table", minCount: 10 },
        { selector: "pre code", minCount: 10 },
        { selector: "h2", minCount: 20 },
      ],
    },
  });
}
