
### focused: 157/168 compliant, 168/168 conformant, pass=true

| Scenario | n | TTFT median / p95 (ms) | x focused p95 | Total median / p95 (ms) | x focused p95 |
|---|---|---|---|---|---|
| `long-markdown` | 12 | 18 / 40 | 1 | 5854 / 5870 | 1 |
| `a2ui-over-agui` | 12 | 44 / 46 | 1 | 189 / 211 | 1 |
| `cancel-mid-stream` | 12 | 15 / 25 | 1 | 1187.5 / 1202 | 1 |
| `custom-chunks` | 12 | 44 / 48 | 1 | 406.5 / 419 | 1 |
| `disconnect-reconnect-replay` | 12 | 34 / 38 | 1 | 1025 / 1039 | 1 |
| `hitl-approve` | 12 | 44 / 47 | 1 | 279 / 290 | 1 |
| `hitl-expire` | 12 | 44.5 / 48 | 1 | 279 / 283 | 1 |
| `hitl-reject` | 12 | 45 / 47 | 1 | 278.5 / 282 | 1 |
| `malformed-out-of-order` | 9 | 130 / 146 | 1 | 280 / 311 | 1 |
| `parallel-tool-calls` | 8 | 59 / 60 | 1 | 688 / 709 | 1 |
| `reasoning-subagents-snapshot` | 11 | 331 / 334 | 1 | 497 / 500 | 1 |
| `run-cancelled-by-agent` | 9 | 44 / 46 | 1 | 126 / 128 | 1 |
| `run-error` | 12 | 45 / 47 | 1 | 105 / 110 | 1 |
| `state-snapshot-delta` | 12 | 149.5 / 155 | 1 | 256 / 261 | 1 |

### unfocused: 82/84 compliant, 84/84 conformant, pass=true

| Scenario | n | TTFT median / p95 (ms) | x focused p95 | Total median / p95 (ms) | x focused p95 |
|---|---|---|---|---|---|
| `long-markdown` | 5 | 19 / 20 | 0.5 | 5875 / 5899 | 1 |
| `a2ui-over-agui` | 6 | 46.5 / 49 | 1.07 | 199.5 / 210 | 1 |
| `cancel-mid-stream` | 6 | 14 / 17 | 0.68 | 1188 / 1190 | 0.99 |
| `custom-chunks` | 6 | 46 / 54 | 1.13 | 417 / 425 | 1.01 |
| `disconnect-reconnect-replay` | 6 | 35.5 / 43 | 1.13 | 1024 / 1029 | 0.99 |
| `hitl-approve` | 6 | 45.5 / 46 | 0.98 | 278 / 286 | 0.99 |
| `hitl-expire` | 6 | 46 / 51 | 1.06 | 278 / 285 | 1.01 |
| `hitl-reject` | 6 | 44.5 / 47 | 1 | 279 / 282 | 1 |
| `malformed-out-of-order` | 6 | 129.5 / 131 | 0.9 | 279 / 284 | 0.91 |
| `parallel-tool-calls` | 6 | 58.5 / 62 | 1.03 | 687 / 689 | 0.97 |
| `reasoning-subagents-snapshot` | 6 | 331 / 344 | 1.03 | 494.5 / 510 | 1.02 |
| `run-cancelled-by-agent` | 5 | 45 / 50 | 1.09 | 126 / 128 | 1 |
| `run-error` | 6 | 44.5 / 63 | 1.34 | 105 / 106 | 0.96 |
| `state-snapshot-delta` | 6 | 149.5 / 154 | 0.99 | 255 / 256 | 0.98 |

### occluded: 83/84 compliant, 84/84 conformant, pass=true

| Scenario | n | TTFT median / p95 (ms) | x focused p95 | Total median / p95 (ms) | x focused p95 |
|---|---|---|---|---|---|
| `long-markdown` | 5 | 18 / 32 | 0.8 | 5851 / 5912 | 1.01 |
| `a2ui-over-agui` | 6 | 43 / 47 | 1.02 | 188.5 / 258 | 1.22 |
| `cancel-mid-stream` | 6 | 15 / 17 | 0.68 | 1189 / 1196 | 1 |
| `custom-chunks` | 6 | 44.5 / 46 | 0.96 | 410.5 / 416 | 0.99 |
| `disconnect-reconnect-replay` | 6 | 35.5 / 37 | 0.97 | 1024.5 / 1027 | 0.99 |
| `hitl-approve` | 6 | 45.5 / 52 | 1.11 | 280.5 / 288 | 0.99 |
| `hitl-expire` | 6 | 44 / 49 | 1.02 | 278 / 279 | 0.99 |
| `hitl-reject` | 6 | 44.5 / 48 | 1.02 | 277.5 / 279 | 0.99 |
| `malformed-out-of-order` | 6 | 129 / 132 | 0.9 | 281 / 283 | 0.91 |
| `parallel-tool-calls` | 6 | 60.5 / 62 | 1.03 | 685.5 / 692 | 0.98 |
| `reasoning-subagents-snapshot` | 6 | 330 / 331 | 0.99 | 497 / 500 | 1 |
| `run-cancelled-by-agent` | 6 | 44.5 / 47 | 1.02 | 127 / 134 | 1.05 |
| `run-error` | 6 | 43.5 / 44 | 0.94 | 105 / 106 | 0.96 |
| `state-snapshot-delta` | 6 | 149.5 / 152 | 0.98 | 256 / 260 | 1 |

### minimised: 83/84 compliant, 80/84 conformant, pass=false

| Scenario | n | TTFT median / p95 (ms) | x focused p95 | Total median / p95 (ms) | x focused p95 |
|---|---|---|---|---|---|
| `long-markdown` | 5 | 53 / 67 | 1.68 | 6220 / 7356 | 1.25 |
| `a2ui-over-agui` | 6 | 172.5 / 181 | 3.93 | 405.5 / 484 | 2.29 |
| `cancel-mid-stream` | 6 | 40 / 57 | 2.28 | 1705 / 2034 | 1.69 |
| `custom-chunks` | 6 | 119 / 271 | 5.65 | 751 / 1399 | 3.34 |
| `disconnect-reconnect-replay` | 6 | 77.5 / 257 | 6.76 | 1987.5 / 2433 | 2.34 |
| `hitl-approve` | 6 | 259 / 427 | 9.09 | 365 / 445 | 1.53 |
| `hitl-expire` | 6 | 298.5 / 368 | 7.67 | 361 / 567 | 2 |
| `hitl-reject` | 6 | 276 / 298 | 6.34 | 338.5 / 551 | 1.95 |
| `malformed-out-of-order` | 6 | 300 / 389 | 2.66 | 342.5 / 410 | 1.32 |
| `parallel-tool-calls` | 6 | 298.5 / 382 | 6.37 | 752.5 / 949 | 1.34 |
| `reasoning-subagents-snapshot` | 6 | 495 / 635 | 1.9 | 592 / 883 | 1.77 |
| `run-cancelled-by-agent` | 6 | 194 / 293 | 6.37 | 266.5 / 345 | 2.7 |
| `run-error` | 6 | 166.5 / 291 | 6.19 | 190.5 / 303 | 2.75 |
| `state-snapshot-delta` | 6 | 313.5 / 456 | 2.94 | 413 / 518 | 1.98 |
