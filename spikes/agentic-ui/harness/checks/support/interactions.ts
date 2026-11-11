/** Performs a scenario's interactions (scenario.ts `Interaction`) against a prototype. */
import { expect, type Locator } from "@playwright/test";
import type { Interaction } from "../../src/domain/scenario.ts";
import type { PrototypePage } from "./prototype-page.ts";

const EXPIRY_TIMEOUT_MS = 20_000;

async function decide(p: PrototypePage, interruptId: string, decision: "approve" | "reject", via: "keyboard" | "pointer"): Promise<void> {
  const card = p.approval(interruptId);
  await expect(card, `approval card for ${interruptId}`).toHaveAttribute("data-status", "pending");
  const button = card.getByTestId(decision === "approve" ? "km-approval-approve" : "km-approval-reject");
  const before = await p.requestCount();
  if (via === "pointer") {
    await button.click();
  } else {
    await p.tabTo(button);
    await p.page.keyboard.press(decision === "approve" ? "Enter" : "Space");
  }
  await p.waitForRequestsAbove(before);
  await p.waitForServerIdle();
  await p.waitForSettled(["interrupted"]);
}

/** Resolves the input element for an A2UI component (the element itself or its first field). */
export function a2uiField(component: Locator): Locator {
  return component.locator("xpath=self::input | self::textarea | .//input | .//textarea").first();
}

export function a2uiComponent(p: PrototypePage, surfaceId: string, componentId: string): Locator {
  return p.page.locator(`[data-testid="km-a2ui-surface"][data-surface-id="${surfaceId}"] [data-a2ui-id="${componentId}"]`).first();
}

export async function fillA2ui(p: PrototypePage, surfaceId: string, values: Readonly<Record<string, string>>): Promise<void> {
  for (const [componentId, value] of Object.entries(values)) await a2uiField(a2uiComponent(p, surfaceId, componentId)).fill(value);
}

export async function toggleA2ui(p: PrototypePage, surfaceId: string, componentIds: readonly string[]): Promise<void> {
  for (const componentId of componentIds) {
    const component = a2uiComponent(p, surfaceId, componentId);
    const box = component.locator("xpath=self::input[@type='checkbox'] | .//input[@type='checkbox'] | self::*[@role='checkbox'] | .//*[@role='checkbox']").first();
    await box.click();
  }
}

export async function performInteraction(p: PrototypePage, interaction: Interaction): Promise<void> {
  switch (interaction.do) {
    case "approve":
    case "reject":
      await decide(p, interaction.interruptId, interaction.do, interaction.via);
      return;
    case "wait-for-expiry":
      await expect(p.approval(interaction.interruptId), "approval card expires").toHaveAttribute("data-status", "expired", { timeout: EXPIRY_TIMEOUT_MS });
      return;
    case "cancel-run":
      await p.waitForAssistantText(interaction.afterTextChars);
      await p.page.getByTestId("km-cancel-run").click();
      await p.waitForSettled(["interrupted"]);
      return;
    case "a2ui-click": {
      if (interaction.fill !== undefined) await fillA2ui(p, interaction.surfaceId, interaction.fill);
      const before = await p.requestCount();
      await a2uiComponent(p, interaction.surfaceId, interaction.componentId).click();
      await p.waitForRequestsAbove(before);
      await p.waitForServerIdle();
      await p.waitForSettled();
      return;
    }
  }
}

/** Runs the whole scenario flow: prompt, initial settle (unless the first step cancels), interactions. */
export async function driveScenario(p: PrototypePage, userPrompt: string, interactions: readonly Interaction[]): Promise<void> {
  await p.submitPrompt(userPrompt);
  const [first] = interactions;
  if (first?.do !== "cancel-run") await p.waitForSettled();
  for (const interaction of interactions) await performInteraction(p, interaction);
}
