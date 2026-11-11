import { expect } from "@playwright/test";
import { type CommandResult, combinedOutput, runCommand } from "../src/support/run-command.ts";
import { Given, type ScenarioState, Then, When } from "./fixtures.ts";

export function lastRun(scenario: ScenarioState): CommandResult {
  if (scenario.lastRun === undefined) throw new Error("No command has run in this scenario");
  return scenario.lastRun;
}

/** Runs a command, keeps its receipt as the scenario's last run and attaches it as evidence. */
export async function runAndRecord(
  scenario: ScenarioState,
  attach: (name: string, options: { body: string; contentType: string }) => Promise<void>,
  command: string,
  cwd?: string,
  env?: NodeJS.ProcessEnv,
): Promise<CommandResult> {
  const result = runCommand(command, cwd, env);
  scenario.lastRun = result;
  await attach(`argv-and-exit: ${command}`, {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  return result;
}

Given("the production web build is served by Vite preview", async ({ request, baseURL }) => {
  const response = await request.get(baseURL ?? "/");
  expect(response.ok(), `Vite preview must answer at ${baseURL}`).toBe(true);
});

When("{string} runs at the repository root", async ({ scenario, $testInfo }, command: string) => {
  await runAndRecord(scenario, (n, o) => $testInfo.attach(n, o), command);
});

Then("the command exits 0", async ({ scenario }) => {
  const run = lastRun(scenario);
  expect(run.exitCode, `${run.command}\n${combinedOutput(run).slice(-4000)}`).toBe(0);
});

Then("the command exits 0 with no error diagnostics", async ({ scenario }) => {
  const run = lastRun(scenario);
  expect(run.exitCode, `${run.command}\n${combinedOutput(run).slice(-4000)}`).toBe(0);
  expect(combinedOutput(run)).not.toMatch(/^error(\[E\d+\])?:/m);
});

Then("the command exits non-zero", async ({ scenario }) => {
  const run = lastRun(scenario);
  expect(run.exitCode, `${run.command} was expected to fail`).not.toBe(0);
});

Then("its output names {string}", async ({ scenario }, name: string) => {
  expect(combinedOutput(lastRun(scenario))).toContain(name);
});
