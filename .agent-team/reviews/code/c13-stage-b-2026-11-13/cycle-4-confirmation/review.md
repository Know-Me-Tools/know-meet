# c13 cycle 4 — final local correction confirmation

**Verdict: BLOCK.** The four original critical defects are addressed in the inspected code. New required-check failures remain, and the isolated judge confirmation is pending. This is the single authorized local confirmation; it grants no further repair, rerun, successor phase or release authority.

## Candidate and authority

- Phase: hybrid-shell-foundation, Execute; selected method VLBV.
- HEAD: `3590e0a1a6bc9e02e1678115e78b35b351c7fed3`.
- Frozen candidate: `8261acbff6b7f7adef0d0dbb558704111f5319e4b7ad503621c2453d5c005b75`.
- Contract revision 5: `6d67489066e4dc6cd06ee6772623d07a9ae0b0eaaa52c622e7d9d6a6173658f4`.
- Baseline set: `ef382d346d063bc1020ba1149a71884bd71e5abf31dc72dfbfd42108346cfa79`.
- Independent reference adjudication approved exactly 25 replacements, preserving rejected captures and unchanged thresholds/matrix. This review does not convert reference approval into application fidelity acceptance.
- The authorized repair cap is four. Historical consumption and the interrupted run are preserved; this report does not authorize a fifth cycle.

Evidence root used below: `.kbd-orchestrator/phases/hybrid-shell-foundation/evidence/c13-stage-b-2026-11-13/approved-cycle-4/`.

## Original critical findings

| Finding | Local confirmation |
|---|---|
| J1: payload presence misrepresented as served bundle identity | Addressed. `check-bundle-identity.ts` emits `embedded-payload-presence`, reports limitations, and removes the fabricated app digest/`identical` result. The adopted frontendDist directory digest and native launch oracle remain separate. Their cycle-4 runtime scenarios did not complete. |
| J2: significant HTML whitespace normalized away | Addressed. `normalizeHtml`/`sameHtml` are removed. The diagnostic excludes HTML and makes no HTML-equivalence claim; directory identity still includes every file. |
| J3: renamed source remains in scratch | Addressed. Candidate capture uses `git diff --no-renames`; the observed real-Git rename/deletion/mode/new-input case passed. |
| J4: symlink ancestry escapes scratch | Addressed for the reported cases. Capture/application validate ancestors, reject nested file/symlink overlays, and write through exclusive descriptors. Observed integration cases reject source and destination symlink escapes and preserve a leaf symlink without dereferencing it. |

The actual `node --test tests/fidelity/src/support/candidate-snapshot.test.ts` receipt is exit 0, **4 tests / 4 passed / 0 failed**, in `03.log`. This reviewer read that evidence and did not execute it.

Earlier viewport/name corrections are also demonstrated: axe now reaches the requested 320px pages, and the keyboard focus/name smoke passed. The separate 600/1000 motion correction and two focus negative-control corrections were inspected statically, but their cycle-4 scenarios have no completed result. Their acceptance remains unverified.

## CRITICAL — remaining completion blockers

1. **Workspace typecheck fails.** `tests/fidelity/src/capture/reference-correction-capture.ts:118` uses `dataset.navClass`; `02.log` reports TS4111 requiring bracket access. `pnpm typecheck` exited 1. Owner: bdd-quality. The recorded diagnostic identifies the required correction; none was applied during freeze.
2. **Required text contrast fails.** Retained browser evidence and the owning roles' trace diagnoses report light cyan text on cyan-soft at **4.36:1**, below 4.5:1, affecting agent glyphs and recording/room badges. Wizard step-4 “Fix in step” links report **4.08:1** on amber-soft. Owner: design-lead with ui-engineer. Select a conforming authorized semantic pair or obtain token-change authority; hiding text from assistive technology does not remedy visual contrast. These safety failures triggered the adopted stop condition.
3. **Visible labels and target geometry fail accessibility acceptance.** The saved axe results report label/name mismatches for the account initials (`account-menu.tsx:54`), “Copy link” (`dashboard-parts.tsx:256`), chapter/transcript buttons, and room controls. The read-only owner diagnoses are recorded in `remaining-work.md`, with trace selectors retained. Focused skip-link overlap also causes target-size failures at 320/375/768/1024; no blanket focus-state waiver is justified. Owners: client-shell/ui-engineer, with bdd-quality for evidence. Any equivalent-control exception requires demonstrated applicability for each obscured function in the exact state; none is certified here.
4. **The scroll-region oracle misses app regions.** `tests/fidelity/src/a11y/scroll-regions-probe.ts:10` selects only `.table-wrap`; the application uses `[data-slot="table-region"]`. The five scroll-region scenarios failed. Saved index traces show real named/focusable overflowing regions while the probe observes none. Owner: bdd-quality. Correct the observed selector gap while preserving the nonzero-observation and focus/contrast assertions; do not classify these five failures as proven inaccessible app tables.

These include pre-existing product defects exposed by the corrected gate. They are not all regressions introduced by the correction batch. They nevertheless prevent acceptance of this candidate.

## WARNING — candidate collection fails on retained evidence volume

`tests/fidelity/src/support/candidate-snapshot.ts:53,93-97` buffers all untracked Git paths through `execFileSync` before applying excluded-root filtering. The after-run helper failed **`spawnSync git ENOBUFS`** when untracked evidence listing exceeded the default buffer. This is an observed harness defect, not a speculative race or a reason to discard evidence. Owner: bdd-quality. Move the existing excluded-path filtering ahead of Git output collection rather than retaining unlimited irrelevant paths in the synchronous output buffer. No implementation or new test was run here.

`candidate-reconciliation.json` records a read-only Python reconstruction of the exact recorded path/mode/content inputs: **119 inputs, sameInputs true, differences [], identical before/after digest `8261acbf…`**. That reconciles the frozen candidate's identity; it does not make the failed helper a PASS or complete any unrun scenario.

## Observed boundary results

| Command/result | Recorded outcome |
|---|---|
| `pnpm --filter @know-meet/web build` | Exit 0 (`01.log`). |
| `pnpm typecheck` | Exit 1, TS4111 (`02.log`). |
| `node --test tests/fidelity/src/support/candidate-snapshot.test.ts` | Exit 0, 4/4 passed (`03.log`). |
| `pnpm --filter @know-meet/fidelity-tests exec bddgen -c playwright.config.ts` | Exit 0 (`04.log`). |
| `pnpm --filter @know-meet/fidelity-tests exec playwright test -c playwright.config.ts --grep '@VS-1|@VS-2|@VS-4|@VS-5|@a11y|@motion'` | Interrupted at the safety-failure boundary. Runner exit 130/SIGINT; Playwright subprocess exit was not observed. |

`partial-result.json` records **16 completed: 5 PASS / 11 FAIL; 108 of 124 planned scenarios without a completed result**. The five passes are index/auth/join axe, keyboard focus/name smoke, and the injected axe-violation control. Failures are six page axe scenarios and five scroll-region scenarios. There is **no completed `playwright.json`**, and `cucumber.json` is empty. `05.log` and failure trace ZIPs are retained. These counts are partial, not a completed-suite verdict.

Full VS-1 screenshots, native VS-2 scenarios, remaining focus/motion controls, current VS-4/VS-5 results and repository lint are **NOT EXERCISED to completion in cycle 4**. Historical evidence cannot replace them. No UI fidelity, full WCAG, native runtime identity or overall phase PASS is asserted. No measured build-time regression baseline was available; the observed web build success is not a comparative performance claim.

`remaining-work.md` was authored while the suite was running; its final “Still pending” wording is superseded for run status by `partial-result.json`. Its retained diagnoses remain useful and were not rewritten by this reviewer.

## Review independence and approval block

This local confirmation is in the independent reviewer context, not a builder self-assessment. No reviewed product code was authored by this reviewer. The earlier isolated Kimi route failed HTTP 500/upstream 524; the first review's same-model-family Codex CLI receipt remains preserved in the parent review directory.

For this correction confirmation, **automatic approval review rejected the new external Codex CLI dispatch before execution**: the proposed operation would transmit private repository source, diffs, contracts and evidence to OpenAI, and the correction-review approval did not explicitly authorize that payload and destination. No workaround or external transmission occurred. Explicit operator approval is still required for the isolated packet dispatch; no answer arrived. The isolated judge confirmation and its anti-theater screen are therefore **pending**, not passed.

The prepared local packet is `packet.json` (355835 bytes; SHA-256 `ffc0d80beb77d69006150c6174ebf928687f9b4548c85053bfe15671a5dc154e`). Exact proposed mandate-plus-packet prompt is `prompt.txt` (358425 bytes; SHA-256 `c43478fe9d607f3905f7da34f9b5added3de1cf593f16a72848eaa6467d3af6c`). Destination/model proposed: OpenAI via fresh read-only ephemeral Codex CLI, `gpt-6-astra`, same model family. The packet was frozen before the stopped gate's final evidence and has not been silently amended. Approval history is in `dispatch-approval.json`.

## Files, verification and limits

This confirmation wrote only review artifacts in this directory: `packet.json`, `prompt.txt`, `dispatch-approval.json`, `local-confirmation-notes.json`, this `review.md`, and `receipt.json`. Original review history is unchanged. Product/test/design files changed by reviewer: **none**. Scenarios, builds, imports, lint and typecheck run by reviewer: **none**. No guards, dependencies, unsolicited product changes or speculative fixes were added.

Local read-only work consisted of source/diff inspection, reading the saved logs/receipts, and comparing supplied source excerpts with the frozen candidate hashes (mismatches `[]`). A current 320px home capture was visually inspected; it is not proof of the full screenshot matrix. Full per-requirement workflow certification, unrun scenarios, isolated judge confirmation, and unresolved accessibility exceptions remain unverified. Final disposition stays **BLOCK**.
