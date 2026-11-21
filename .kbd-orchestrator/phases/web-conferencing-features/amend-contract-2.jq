# Contract amendment 2 for web-conferencing-features (DRAFT).
# Apply only after the operator approves, with the operator's answer and the date:
#   jq --arg answer "<operator's words>" --arg date "<YYYY-MM-DD>" \
#      -f amend-contract-2.jq adopted-contract.json
# Purpose: the boundary is decided only by what a user can do in a meeting.
# Changes: boundaryPacket (commands, gate, signals, repairPolicy, staticGateMode removed,
# runInputs), budgets.extensions, stopConditions wording, adoptionSource.
# Unchanged: functional scope, the scenario texts, exclusions, required safety checks,
# release claim. Required safety checks stay; how each is shown is listed in gateEvidence.

.boundaryPacket.gateScenarios = ["WC-1","WC-2","WC-3","WC-4","WC-5","WC-6","WC-7","WC-8","WC-9","WC-11 (notes still work)","WC-12","WC-13"]

| .boundaryPacket.gateRule = "The boundary verdict is decided only by the gate scenarios: tasks a person does in a meeting (share, chat, effects, devices, speaker, history, recording, consent, Enable audio, notes) and the accessibility and design-fidelity of the new controls. Each runs end to end through the built images and the browser. Anything else is a recorded signal: it never decides the verdict, never stops the run and never consumes a repair."

| .boundaryPacket.signals = [
    "pnpm lint, pnpm typecheck, pnpm test (unit): run once, recorded; failures are fixed in the next batched repair if one happens, otherwise listed in the closure",
    "render-gateway-headers.ts --check and the WC-10 header and default-build checks",
    "WC-11 lockfile and versions.toml pin checks",
    "WC-14 repository rules and other-shell builds",
    "WR-4 token-abuse and the leak-detector negative controls"
  ]

| .boundaryPacket.gateEvidence = {
    "consent before recording, indicator for everyone": "WC-8, WC-9",
    "explicit chat audience; private delivered only to its recipient": "WC-2, WC-3",
    "history and recordings never sent to a server": "WC-7, WC-8 network logs",
    "no secret in tracked files, bundle or image": "security-reviewer at step 11 (review, not a test gate)",
    "CSP hosted-only; WASM, model and worker files from 'self'": "WC-4 (effects load with no CSP violation); the desktop byte-identity check is a signal because desktop is out of scope",
    "WCAG 2.2 AA, Flat 2.0, reduced motion": "WC-13"
  }

| .boundaryPacket.commands = [
    "pnpm install --frozen-lockfile",
    "KM_LIVEKIT_URL from LIVEKIT_URL: pnpm --filter @know-meet/web build:hosted; pnpm --filter @know-meet/web build (default build for the preview)",
    "docker build -f apps/web/Dockerfile and -f services/livekit/Dockerfile; record digests",
    "docker compose -f tooling/release/compose.yaml --env-file tooling/release/release-test.env up -d; vite preview of the default build",
    "Packaged Playwright run to completion (no stop at first failure), with the same release-test.env exported to the runner; verdict computed from the gate scenarios only",
    "Signals (non-gating): lint, typecheck, unit tests, header --check; recorded",
    "Reviews: axe, prometheus-ui-review, security-reviewer, glm-5.3 adversarial diff review",
    "STOP for operator approval",
    "git push of the phase branch; gh pr create; operator merges",
    "Wait for continuous deployment; compare the live web image digest with the workflow build of the merged commit",
    "Hosted Playwright run of the gate scenarios"
  ]

| .boundaryPacket.repairPolicy = "A repair is counted only for gate-scenario failures. After one packaged run to completion lists every failing gate scenario, one commit fixes all of them, plus any signal failure known at that time. Signal failures alone never consume a repair."

| del(.boundaryPacket.staticGateMode)

| .boundaryPacket.stopConditions = [
    "Any gate scenario fails in the packaged run: nothing is pushed",
    "A security review CRITICAL finding",
    "The live digest differs from the merged build",
    "Budget exhaustion: checkpoint + BLOCKED; no further extension, the phase closes unmet with its evidence"
  ]

| .boundaryPacket.runInputs += [
    "tooling/release/release-test.env (committed): local test values for the token service's per-address limits, the ports and KM_SITE_ORIGIN, read by compose and by the Playwright runner. The suite plays many people creating many meetings from one machine; the production limits are unchanged and are not a gate"
  ]

| .budgets.extensions += [{
    id: "ext-2-user-scenario-gate",
    repairAttempts: 2,
    timeMinutes: 600,
    toolCalls: 0,
    resultingCeilings: { timeMinutes: 2700, toolCalls: 2500, repairAttempts: 7, noProgressLimit: 3 },
    reason: "Repairs 1-4 went to lint, type, unit-test and harness failures, against AGENTS.md (unit and per-edit tests are not completion evidence; one integration gate through the real production path). No user scenario has yet reached its feature. Repair 5 sets the committed test environment and fixes the WC-12 helper; repairs 6 and 7 are for gate-scenario failures only. This is the last extension: if a gate scenario still fails after repair 7, the phase closes unmet.",
    operatorAnswer: $answer,
    date: $date
  }]

| .adoptionSource += " Amendment 2: operator answer \"" + $answer + "\" on " + $date
    + ": the boundary verdict is decided only by user-task scenarios (WC-1 to WC-9, WC-11 notes, WC-12, WC-13); lint, typecheck, unit tests, header, pin, repo-rule and token-abuse checks become non-gating signals; repairs count only for gate-scenario failures; repairAttempts 5 to 7 and timeMinutes 2100 to 2700, the last extension."
