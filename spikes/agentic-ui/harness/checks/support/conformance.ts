/** Full conformance verdict for a scenario: snapshot, server log, DOM and forbidden text. */
import { expect } from "@playwright/test";
import type { ExpectedDomAssertion, ExpectedOutcome } from "../../src/domain/expected.ts";
import { compareServer, compareSnapshot } from "./compare.ts";
import { harnessApi } from "./harness-api.ts";
import type { PrototypePage } from "./prototype-page.ts";

async function domProblems(p: PrototypePage, assertions: readonly ExpectedDomAssertion[]): Promise<string[]> {
  const problems: string[] = [];
  for (const a of assertions) {
    const matches = p.transcript.locator(a.selector);
    const count = await matches.count();
    if (a.count !== undefined && count !== a.count) problems.push(`dom ${a.selector}: expected ${a.count}, found ${count}`);
    if (a.minCount !== undefined && count < a.minCount) problems.push(`dom ${a.selector}: expected at least ${a.minCount}, found ${count}`);
    if (a.textIncludes !== undefined) {
      const texts = await matches.allInnerTexts();
      if (!texts.some((t) => t.includes(a.textIncludes ?? ""))) problems.push(`dom ${a.selector}: no match contains ${JSON.stringify(a.textIncludes)}`);
    }
  }
  return problems;
}

async function forbiddenTextProblems(p: PrototypePage, forbidden: readonly string[]): Promise<string[]> {
  if (forbidden.length === 0) return [];
  const text = await p.transcript.evaluate((el) => el.textContent ?? "");
  return forbidden.filter((f) => text.includes(f)).map((f) => `forbidden text rendered: ${JSON.stringify(f)}`);
}

export async function conformanceProblems(p: PrototypePage, expected: ExpectedOutcome): Promise<string[]> {
  const snapshot = await p.snapshot();
  const session = await harnessApi.session(p.sessionId);
  const serverProblems = session === null ? ["server: no request reached the mock server for this session"] : compareServer(expected.server, session.summary);
  return [
    ...compareSnapshot(expected, snapshot),
    ...serverProblems,
    ...(await domProblems(p, expected.dom ?? [])),
    ...(await forbiddenTextProblems(p, expected.forbiddenText ?? [])),
  ];
}

/**
 * Polls the verdict until it is clean or `timeout` passes, so a prototype that
 * is still applying already-received events is not failed early. The last
 * problem list is what the failure reports.
 */
export async function expectConformance(p: PrototypePage, expected: ExpectedOutcome, label: string, timeout = 10_000): Promise<void> {
  await p.waitForServerIdle();
  await expect.poll(() => conformanceProblems(p, expected), { timeout, message: `conformance problems for ${label}` }).toEqual([]);
}
