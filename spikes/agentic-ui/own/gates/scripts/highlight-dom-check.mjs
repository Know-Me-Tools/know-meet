// Gate 16.3 follow-up: counts highlighted code spans after long-markdown settles (WebKit). node gates/scripts/highlight-dom-check.mjs <url>
import { createRequire } from "node:module";
const require = createRequire("/Users/gqadonis/Projects/know-me/know-meet/spikes/agentic-ui/harness/package.json");
const { webkit } = require("@playwright/test");
const [,, url, scen="long-markdown"] = process.argv;
const b = await webkit.launch(); const p = await (await b.newContext()).newPage();
const u = new URL(url); u.searchParams.set("scenario", scen); u.searchParams.set("agui","http://127.0.0.1:4317"); u.searchParams.set("session","dom-"+Date.now()); u.searchParams.set("allowMediaOrigin","http://127.0.0.1:4317");
await p.goto(u.toString()); await p.waitForFunction(()=>window.__spike?.ready===true);
await p.getByTestId("km-composer-input").fill("Summarise the whole meeting in detail."); await p.getByTestId("km-composer-submit").click();
await p.waitForFunction(()=>["finished","error","cancelled","interrupted"].includes(window.__spike.snapshot().runStatus),undefined,{timeout:120000});
await p.waitForTimeout(3000);
console.log(JSON.stringify(await p.evaluate(()=>({pre:document.querySelectorAll("pre").length, coloredSpans:document.querySelectorAll("pre span[style]").length, shikiRes: performance.getEntriesByType("resource").map(r=>r.name).filter(n=>/typescript|github|highlighted/.test(n)).map(n=>n.split("/").pop()), sample: document.querySelector("pre")?.outerHTML.slice(0,300)}))));
await b.close();
