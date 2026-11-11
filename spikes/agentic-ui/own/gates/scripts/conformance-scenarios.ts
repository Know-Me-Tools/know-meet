/**
 * The 14 AG-UI conformance scenarios of the c15 harness corpus (gate 16.1 runs). long-markdown runs
 * first: steps that finish before the window stager has sampled the state are excluded, and its first
 * repeat (about 6 s) absorbs that start-up window.
 */
export const CONFORMANCE_SCENARIOS: readonly string[] = [
  "long-markdown", "a2ui-over-agui", "cancel-mid-stream", "custom-chunks", "disconnect-reconnect-replay", "hitl-approve", "hitl-expire",
  "hitl-reject", "malformed-out-of-order", "parallel-tool-calls", "reasoning-subagents-snapshot", "run-cancelled-by-agent", "run-error",
  "state-snapshot-delta",
];
