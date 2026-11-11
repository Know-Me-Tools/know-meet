// Supplementary measurement (not part of the harness): how long after `runStatus` settles the
// deferred Streamdown render finishes, and the long-task time up to that point.
// Usage: node scripts/render-lag.mjs [chromium|webkit] [repeats]
import { chromium, webkit } from "../../harness/node_modules/@playwright/test/index.mjs";

const browserName = process.argv[2] ?? "chromium";
const repeats = Number(process.argv[3] ?? "3");
const CASES = [
  { scenario: "long-markdown", prompt: "Summarise the whole meeting in detail.", selector: "h2", min: 20 },
  { scenario: "hostile/huge-table", prompt: "Hostile corpus item huge-table.", selector: "table tbody tr", min: 400 },
];

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

const browser = await (browserName === "webkit" ? webkit : chromium).launch();
const out = {};
for (const c of CASES) {
  const rows = [];
  for (let i = 0; i < repeats; i += 1) {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__lag = { tasks: [] };
      try {
        new PerformanceObserver((l) => window.__lag.tasks.push(...l.getEntries().map((e) => ({ s: e.startTime, d: e.duration })))).observe({ type: "longtask", buffered: true });
      } catch {
        window.__lag.unsupported = true;
      }
    });
    await page.goto(`http://localhost:4175/?scenario=${encodeURI(c.scenario)}&agui=http://127.0.0.1:4317&session=lag-${Date.now()}-${i}&allowMediaOrigin=http://127.0.0.1:4317`);
    await page.waitForFunction(() => window.__spike?.ready === true);
    await page.getByTestId("km-composer-input").fill(c.prompt);
    const submitAt = await page.evaluate(() => performance.now());
    await page.getByTestId("km-composer-submit").click();
    const settledAt = await (await page.waitForFunction(() => (["finished", "error", "cancelled"].includes(window.__spike.snapshot().runStatus) ? performance.now() : false), undefined, { polling: 20, timeout: 60000 })).jsonValue();
    const renderedAt = await (await page.waitForFunction(({ sel, min }) => (document.querySelectorAll(`[data-testid="km-transcript"] ${sel}`).length >= min ? performance.now() : false), { sel: c.selector, min: c.min }, { polling: 20, timeout: 60000 })).jsonValue();
    const tasks = await page.evaluate((since) => (window.__lag.unsupported ? null : window.__lag.tasks.filter((t) => t.s >= since).reduce((a, t) => a + t.d, 0)), submitAt);
    rows.push({ settleMs: settledAt - submitAt, renderCompleteMs: renderedAt - submitAt, lagAfterSettleMs: Math.max(0, renderedAt - settledAt), longTaskMsToRender: tasks });
    await page.close();
  }
  out[c.scenario] = {
    runs: rows,
    median: Object.fromEntries(Object.keys(rows[0]).map((k) => [k, rows[0][k] === null ? null : Math.round(median(rows.map((r) => r[k])))])),
  };
}
await browser.close();
console.log(JSON.stringify({ browser: browserName, measuredAt: new Date().toISOString(), cases: out }, null, 2));
