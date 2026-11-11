
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

### occluded: 83/84 compliant, 84/84 conformant, pass=false

| Scenario | n | TTFT median / p95 (ms) | x focused p95 | Total median / p95 (ms) | x focused p95 |
|---|---|---|---|---|---|
| `long-markdown` | 5 | 17 / 21 | 0.53 | 5852 / 5868 | 1 |
| `a2ui-over-agui` | 6 | 44 / 48 | 1.04 | 189.5 / 207 | 0.98 |
| `cancel-mid-stream` | 6 | 15 / 16 | 0.64 | 1185.5 / 1188 | 0.99 |
| `custom-chunks` | 6 | 44.5 / 47 | 0.98 | 419 / 445 | 1.06 |
| `disconnect-reconnect-replay` | 6 | 34.5 / 36 | 0.95 | 1030.5 / 1035 | 1 |
| `hitl-approve` | 6 | 45.5 / 63 | 1.34 | 286.5 / 302 | 1.04 |
| `hitl-expire` | 6 | 45.5 / 180 | 3.75 | 278.5 / 420 | 1.48 |
| `hitl-reject` | 6 | 44.5 / 45 | 0.96 | 278.5 / 279 | 0.99 |
| `malformed-out-of-order` | 6 | 129.5 / 134 | 0.92 | 280 / 284 | 0.91 |
| `parallel-tool-calls` | 6 | 58.5 / 62 | 1.03 | 687 / 689 | 0.97 |
| `reasoning-subagents-snapshot` | 6 | 330 / 331 | 0.99 | 493.5 / 496 | 0.99 |
| `run-cancelled-by-agent` | 6 | 45 / 69 | 1.5 | 126.5 / 129 | 1.01 |
| `run-error` | 6 | 44.5 / 49 | 1.04 | 105 / 108 | 0.98 |
| `state-snapshot-delta` | 6 | 149.5 / 150 | 0.97 | 254 / 257 | 0.98 |

### minimised: 84/84 compliant, 84/84 conformant, pass=false

| Scenario | n | TTFT median / p95 (ms) | x focused p95 | Total median / p95 (ms) | x focused p95 |
|---|---|---|---|---|---|
| `long-markdown` | 6 | 19 / 37 | 0.93 | 6034.5 / 6840 | 1.17 |
| `a2ui-over-agui` | 6 | 45.5 / 64 | 1.39 | 200.5 / 208 | 0.99 |
| `cancel-mid-stream` | 6 | 15 / 17 | 0.68 | 1914 / 2051 | 1.71 |
| `custom-chunks` | 6 | 43.5 / 46 | 0.96 | 915.5 / 1352 | 3.23 |
| `disconnect-reconnect-replay` | 6 | 35.5 / 37 | 0.97 | 1915.5 / 1927 | 1.85 |
| `hitl-approve` | 6 | 46 / 49 | 1.04 | 664 / 907 | 3.13 |
| `hitl-expire` | 6 | 44.5 / 47 | 0.98 | 924.5 / 928 | 3.28 |
| `hitl-reject` | 6 | 44.5 / 50 | 1.06 | 661 / 923 | 3.27 |
| `malformed-out-of-order` | 6 | 129 / 136 | 0.93 | 907 / 916 | 2.95 |
| `parallel-tool-calls` | 6 | 59 / 60 | 1 | 912.5 / 921 | 1.3 |
| `reasoning-subagents-snapshot` | 6 | 331 / 334 | 1 | 914 / 928 | 1.86 |
| `run-cancelled-by-agent` | 6 | 45 / 47 | 1.02 | 126 / 127 | 0.99 |
| `run-error` | 6 | 44.5 / 45 | 0.96 | 105 / 110 | 1 |
| `state-snapshot-delta` | 6 | 149.5 / 150 | 0.97 | 917.5 / 929 | 3.56 |
