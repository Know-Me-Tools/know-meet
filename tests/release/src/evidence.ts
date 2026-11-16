/**
 * Evidence attachments. Everything lands in the Playwright report and in the
 * test's output folder under KM_EVIDENCE_DIR. Nothing recorded here may hold a
 * token signature, a secret or a signal URL query.
 */
import type { Page, TestInfo } from "@playwright/test";

export async function attachJson(testInfo: TestInfo, name: string, value: unknown): Promise<void> {
  await testInfo.attach(name, {
    body: JSON.stringify(value, null, 2),
    contentType: "application/json",
  });
}

export async function attachScreenshot(
  testInfo: TestInfo,
  page: Page,
  name: string,
): Promise<void> {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: "image/png" });
}
