// Diagnostic: replicate the conformance HITL flow in a browser and log the Tab order.
// Usage: node scripts/tab-probe.mjs [webkit|chromium] [scenario]
import { createRequire } from "node:module";
const require = createRequire(new URL("../../harness/package.json", import.meta.url));
const pw = require("@playwright/test");
const browser = await pw[process.argv[2] ?? "webkit"].launch();
const page = await (await browser.newContext()).newPage();
const scenario = process.argv[3] ?? "hitl-approve";
const prompt = (await (await fetch(`http://127.0.0.1:4317/scenarios/${scenario}`)).json()).scenario.userPrompt;
await page.goto(`http://localhost:4173/?scenario=${scenario}&agui=http://127.0.0.1:4317&session=tab-${Date.now()}&allowMediaOrigin=http://127.0.0.1:4317`);
await page.waitForFunction(() => window.__spike?.ready === true);
await page.getByTestId("km-composer-input").fill(prompt);
await page.getByTestId("km-composer-submit").click();
await page.waitForFunction(() => window.__spike.snapshot().runStatus === "interrupted");
const describe = () => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}${a.getAttribute("data-testid") ? "#" + a.getAttribute("data-testid") : ""}` : "none"; });
console.log("start", await describe());
for (let i = 0; i < 12; i += 1) { await page.keyboard.press("Tab"); console.log(i, await describe()); }
await browser.close();
