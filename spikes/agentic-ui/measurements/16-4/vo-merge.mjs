// Merges the runner timeline (run.log) and VoiceOver phrases (vo-phrases.jsonl) into one transcript.
import { readFileSync, writeFileSync } from "node:fs";
const dir = process.argv[2];
const runs = readFileSync(`${dir}/run.log`, "utf8").split("\n").filter(Boolean).map((l) => ({ t: +l.slice(0, 13), text: "RUN  " + l.slice(14) })).filter((x) => !/ExperimentalWarning|trace-warnings/.test(x.text));
const vo = readFileSync(`${dir}/vo-phrases.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).map((o) => ({ t: o.t, text: o.phrase !== undefined ? `VO   ${JSON.stringify(o.phrase)}` : `POLL ${o.kind} ${o.polls ?? ""} errors=${o.errors ?? ""}` }));
const all = [...runs, ...vo].sort((a, b) => a.t - b.t);
let plan = all[0].t;
const out = all.map((x) => { if (/^RUN  \S+: a11y-/.test(x.text)) plan = x.t; return `${String(((x.t - plan) / 1000).toFixed(2)).padStart(7)}s  ${x.text}`; });
writeFileSync(`${dir}/transcript.txt`, out.join("\n") + "\n");
console.log(out.join("\n"));
