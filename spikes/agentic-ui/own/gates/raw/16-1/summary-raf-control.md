
### focused: 84/84 compliant, 84/84 conformant, pass=true

| Scenario | n | TTFT median / p95 (ms) | x focused p95 | Total median / p95 (ms) | x focused p95 |
|---|---|---|---|---|---|
| `long-markdown` | 6 | 18.5 / 29 | 1 | 5854 / 5896 | 1 |
| `a2ui-over-agui` | 6 | 44 / 45 | 1 | 188 / 190 | 1 |
| `cancel-mid-stream` | 6 | 15.5 / 24 | 1 | 1186 / 1191 | 1 |
| `custom-chunks` | 6 | 43.5 / 46 | 1 | 405.5 / 412 | 1 |
| `disconnect-reconnect-replay` | 6 | 34 / 38 | 1 | 1024 / 1028 | 1 |
| `hitl-approve` | 6 | 46.5 / 47 | 1 | 277.5 / 283 | 1 |
| `hitl-expire` | 6 | 45 / 46 | 1 | 279.5 / 286 | 1 |
| `hitl-reject` | 6 | 45 / 46 | 1 | 278 / 283 | 1 |
| `malformed-out-of-order` | 6 | 129 / 130 | 1 | 280.5 / 284 | 1 |
| `parallel-tool-calls` | 6 | 59 / 61 | 1 | 686 / 691 | 1 |
| `reasoning-subagents-snapshot` | 6 | 330 / 332 | 1 | 493.5 / 497 | 1 |
| `run-cancelled-by-agent` | 6 | 44 / 48 | 1 | 126.5 / 127 | 1 |
| `run-error` | 6 | 44 / 46 | 1 | 106 / 115 | 1 |
| `state-snapshot-delta` | 6 | 150 / 152 | 1 | 255.5 / 264 | 1 |

### occluded: 83/84 compliant, 84/84 conformant, pass=true

| Scenario | n | TTFT median / p95 (ms) | x focused p95 | Total median / p95 (ms) | x focused p95 |
|---|---|---|---|---|---|
| `long-markdown` | 5 | 17 / 21 | 0.72 | 5849 / 5976 | 1.01 |
| `a2ui-over-agui` | 6 | 45 / 50 | 1.11 | 191.5 / 213 | 1.12 |
| `cancel-mid-stream` | 6 | 16 / 17 | 0.71 | 1186.5 / 1193 | 1 |
| `custom-chunks` | 6 | 43.5 / 46 | 1 | 409.5 / 421 | 1.02 |
| `disconnect-reconnect-replay` | 6 | 34 / 42 | 1.11 | 1024.5 / 1049 | 1.02 |
| `hitl-approve` | 6 | 45 / 46 | 0.98 | 279.5 / 280 | 0.99 |
| `hitl-expire` | 6 | 44.5 / 49 | 1.07 | 278 / 283 | 0.99 |
| `hitl-reject` | 6 | 45 / 48 | 1.04 | 280 / 285 | 1.01 |
| `malformed-out-of-order` | 6 | 130 / 132 | 1.02 | 279 / 288 | 1.01 |
| `parallel-tool-calls` | 6 | 59.5 / 63 | 1.03 | 688 / 696 | 1.01 |
| `reasoning-subagents-snapshot` | 6 | 331.5 / 335 | 1.01 | 494 / 498 | 1 |
| `run-cancelled-by-agent` | 6 | 44.5 / 46 | 0.96 | 128 / 136 | 1.07 |
| `run-error` | 6 | 43 / 44 | 0.96 | 105 / 115 | 1 |
| `state-snapshot-delta` | 6 | 149.5 / 156 | 1.03 | 256 / 261 | 0.99 |

### minimised: 83/84 compliant, 79/84 conformant, pass=false

| Scenario | n | TTFT median / p95 (ms) | x focused p95 | Total median / p95 (ms) | x focused p95 |
|---|---|---|---|---|---|
| `long-markdown` | 5 | 46 / 61 | 2.1 | 6458 / 7233 | 1.23 |
| `a2ui-over-agui` | 6 | 151 / 281 | 6.24 | 337.5 / 459 | 2.42 |
| `cancel-mid-stream` | 6 | 40.5 / 1183 | 49.29 | 1526.5 / 2037 | 1.71 |
| `custom-chunks` | 6 | 164.5 / 403 | 8.76 | 720.5 / 985 | 2.39 |
| `disconnect-reconnect-replay` | 6 | 114 / 244 | 6.42 | 1837.5 / 2176 | 2.12 |
| `hitl-approve` | 6 | 168.5 / 189 | 4.02 | 382.5 / 400 | 1.41 |
| `hitl-expire` | 6 | 178 / 247 | 5.37 | 357.5 / 390 | 1.36 |
| `hitl-reject` | 6 | 185.5 / 229 | 4.98 | 432.5 / 1712 | 6.05 |
| `malformed-out-of-order` | 6 | 255 / 394 | 3.03 | 410.5 / 850 | 2.99 |
| `parallel-tool-calls` | 6 | 230.5 / 1566 | 25.67 | 988.5 / 1867 | 2.7 |
| `reasoning-subagents-snapshot` | 6 | 447 / 1270 | 3.83 | 592 / 1340 | 2.7 |
| `run-cancelled-by-agent` | 6 | 155.5 / 168 | 3.5 | 188 / 232 | 1.83 |
| `run-error` | 6 | 261.5 / 340 | 7.39 | 269 / 513 | 4.46 |
| `state-snapshot-delta` | 6 | 177.5 / 190 | 1.25 | 339 / 614 | 2.33 |
