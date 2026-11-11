// Diagnostic: open a scenario, submit its prompt, wait to settle, print axe violations with targets.
// Usage: node scripts/axe-probe.mjs <scenario>   (uses the harness's playwright + axe installs)
import { createRequire } from "node:module";
const require = createRequire(new URL("../../harness/package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const scenario = process.argv[2] ?? "hitl-approve";
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const session = `probe-${Date.now()}`;
const prompt = (await (await fetch(`http://127.0.0.1:4317/scenarios/${scenario}`)).json()).scenario.userPrompt;
await page.goto(`http://localhost:4173/?scenario=${encodeURIComponent(scenario)}&agui=http://127.0.0.1:4317&session=${session}&allowMediaOrigin=http://127.0.0.1:4317`);
await page.waitForFunction(() => window.__spike?.ready === true);
await page.getByTestId("km-composer-input").fill(prompt);
await page.getByTestId("km-composer-submit").click();
await page.waitForFunction(() => ["finished", "interrupted", "cancelled", "error"].includes(window.__spike.snapshot().runStatus));
await page.waitForTimeout(500);
const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
for (const v of result.violations) for (const n of v.nodes) console.log(v.id, n.target.join(" "), n.failureSummary?.replace(/\n/g, " "));
console.log(JSON.stringify(await page.evaluate(() => window.__spike.renderCounts())));
await browser.close();
