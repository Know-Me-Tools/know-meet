# c13 Stage B independent review — 2026-11-13

Verdict: **BLOCK**. This is an independent reviewer context, activated by delivery-lead after the completed production repair batch. No product file was changed and no test, build, import, lint or typecheck was run by this reviewer.

## Authority and candidate

- Phase: hybrid-shell-foundation, Execute; selected method VLBV.
- Adopted binding revision 4, contract `261ec2fd7ff96c0deaa35a4d59f8723858ecdcdeec2e417e0e090c27d7bec7b6`; method context is a recovery index, not a new grant.
- `execution.md` records the operator continuation and completed-repair-boundary review authority. c08.8.3/c16 remain outside this boundary. Historical budgets and unresolved effects are not reset.
- Scope: `apps/web/src/app/**`, `apps/web/src/styles/**`, `apps/web/src/presentation/**`, `packages/ui/**`, `tests/fidelity/**`.
- Captured cumulative tracked HEAD diff SHA-256: `97a16084fb1a6de1d7b832300dc163919b0845064797fb26f81e44d6f080c60d`; packet also includes 9 untracked files. Packet is preserved as `packet.json`.
- No baseline or threshold change is authorized by this review. `tests/fidelity/baseline-defects.md` is a proposal awaiting adoption.

## CRITICAL — completion blockers

### R1: The new 320px loop fails before inspecting any page

`tests/fidelity/steps/accessibility.steps.ts:12` and `tests/fidelity/steps/flat-controls.steps.ts:9` now include 320, but `src/support/capture-environment.ts:55` calls `viewportFor`, which throws for every width absent from the frozen four-width table. The current support run records failures in the page accessibility and flat-control scenarios before their browser checks execute. This blocks the required accessibility gate; it is not evidence that those screens failed axe.

Owner: bdd-quality. Add an explicit accessibility-only viewport path while preserving the frozen screenshot capture environment and baseline digest. The driver already assigned this diagnosis; do not duplicate its repair. Verify the complete applicable accessibility gate at the authorized confirmation boundary.

### R2: Pre-existing dirty desktop check cannot prove what the app serves at a path

`tests/fidelity/src/bundle-identity/check-bundle-identity.ts:124-141` scans all binary bytes for decompressible payloads, then checks membership in a set of hashes. It never reads the asset-table keys or the app's served responses. It constructs the alleged app digest from the web build's paths and hashes when membership succeeds. Consequently, a binary with an altered asset key, swapped path mapping, or unreachable retained payloads can return `identical: true`, even though requests do not serve the corresponding web files. Extra served assets are also invisible.

This code predates the current repair batch but is included in the requested cumulative dirty-tree review. This is a static counterexample to its `serves the same content`/independent digest claim, not a reproduced native-runtime failure. The one-byte payload negative control cannot expose this class of false PASS.

Owner: bdd-quality. Bind path to payload using independently observed served responses or a verified extraction of the actual asset map; compare both path sets. The bounded correction for this phase is to retain this strictly as an explicitly named payload-presence diagnostic, remove its fabricated app digest/identical/serving assertions, and preserve the adopted VS-2 frontendDist-to-web directory digest pair plus native launch screenshot. That narrower adopted VS-2 oracle does not require a new native asset-map extraction subsystem. This finding blocks the added stronger claim, not a separately evidenced narrower VS-2 PASS.

### R3: Fresh visual and accessibility acceptance is not established

The historical `/private/tmp/km-vs1c/playwright.json` reports 20 expected / 54 unexpected, start `2026-11-13T01:13:51.484Z`. Its receipts do not establish the current candidate's full screenshot matrix. The current support evidence additionally records failing focus audit controls. There is no basis for visual PASS, phase closure or resetting repair consumption. This is a certification blocker, not a claim that every code change is wrong.

Owner: delivery-lead, with bdd-quality and design-lead. Preserve the failed receipts and budget history, triage the gate defects, obtain baseline adjudication where needed, then supply authorized fresh evidence keyed to the candidate. Do not change product navigation or invent catalog links to match an inconsistent reference.

## WARNING — actionable observations

### R4: Keyboard name approximation rejects a correctly labelled native input

`tests/fidelity/steps/accessibility.steps.ts:95-101` reads aria-label, one aria-labelledby target, element text, then title. It does not read native associated labels. Current `accessibility.feature-Acce-bd708-l-on-the-app-frame-controls-web/error-context.md` reports the join-code input as unnamed in both themes. `home-join-form.tsx` supplies `id="join-code"`, and `public-shared/form-field.tsx` renders `Label htmlFor={id}`. The current saved accessibility snapshot names the textbox `Join with a code`, refuting a product naming failure.

Owner: bdd-quality. Use the browser accessibility-name computation (or a standards-compliant existing name checker) and account for multiple aria-labelledby IDs. Do not add redundant product ARIA to satisfy this approximation. This logic predates the small viewport diff, but it blocks the reviewed gate and is demonstrated by current evidence.

### R5: Two negative controls are currently red

Current saved error contexts for `flat-controls.feature-Flat-9d1a9-us-fill-before-measuring-it-web` and `flat-controls.feature-Flat-1109b--skip-link-s-true-rest-fill-web` report failed assertions for the translucent focus and focused-at-render skip-link controls. The first records 22 unexpected control labels; the second records expected true / received false. Root cause is not established by these artifacts, and this review does not attribute them to product CSS without diagnosis.

Owner: bdd-quality. Diagnose before claiming the focus oracle is sound. Retain these failure contexts in the one batched correction cycle.

## UI, boundary and build inspection

Loaded adversarial-review, prometheus-ui-review, better-accessibility, code-review-and-quality, second-opinion, spec-to-code-compliance and React platform review guidance. No taste skill was loaded. PROJECT/ DESIGN authority was preserved; no redesign is proposed.

The current 1440px dark and light home screenshots from the keyboard test were visually inspected. They show the frame, labelled join-code field and main hero without an obvious large-width clipping defect. They do not establish focus contrast, all states, reduced motion, keyboard operation, 320/375/768/1024 reflow, or prototype tolerance. Those remain unverified here.

No changed domain/application code or new SDK dependency is present in the scoped production diff. The frame imports HomeFooter from presentation, within the existing outer-layer composition; no inward dependency violation was found in that change. There was no measured build-time baseline for a regression comparison. New executable binary scanning is heavy work and must remain boundary-only; no performance PASS is asserted.

Observed driver receipts (not reviewer-run commands):

- `pnpm --filter @know-meet/web build`: exit 0, 2026-11-13 10:31:08–10:31:11 UTC, `build-1.log`.
- `pnpm --filter @know-meet/fidelity-tests typecheck`: exit 0, 10:31:11–10:31:12 UTC, `build-2.log`.
- `build-commands.json` records both exits and log digests. Final support report: 17 passed / 28 failed, duration 98202.471ms, start 10:32:53.569 UTC. The command `pnpm --filter @know-meet/fidelity-tests exec playwright test -c playwright.config.ts --grep "@VS-4|@VS-5|@a11y|@motion"` exited 1. Failures: 23 `No adopted viewport for width 320`, one each for widths 600 and 1000 in motion scenarios, one native-label false negative, and two focus-oracle controls. VS-4 (3 scenarios) and VS-5 (2 scenarios) passed; this does not establish VS-1. The broader viewport limitation also affects motion checks, which must use a non-baseline context helper.

Evidence root: `.kbd-orchestrator/phases/hybrid-shell-foundation/evidence/c13-stage-b-2026-11-13/`. Current screenshot files: `suite/test-results/accessibility.feature-Acce-bd708-l-on-the-app-frame-controls-web/test-failed-1.png` and `test-failed-2.png`.

## Independent judge routing

The documented isolated REST packet workflow is used. Fresh preflight resolved `http://localhost:4000/v1`, judge alias `k3.1-pro`, identity `(kimi-coding-plan, moonshot, k3.1-pro)`, critic `(minimax-direct, minimax, MiniMax-M3)`.

Builder identity is reported as Codex GPT-6 family; exact backend variant and canonical provider tuple are unavailable. The packet deliberately records producer_model unknown and removes stale historical producer metadata. Family distinctness is supported by the reported builder family and configured Kimi route; exact tuple comparison remains unverified.

The initial sandbox dispatch failed with HTTP 000/exit 3. A direct curl probe failed immediately; the script's timeout wording is not evidence of elapsed 900/1800/3600-second waits. The permitted outside-sandbox retry returned exit 3: gateway HTTP 500, upstream error 524. No Kimi findings were produced. Preserve `dispatch.log` and `dispatch-unsandboxed.log`. No completed cross-model review is claimed.

The separate spec-to-code plugin Workflow/slash-command adapter is not exposed by this harness; no full per-requirement fan-out certification is claimed. Adopted scenario criteria were instead included in the isolated judge packet and used for this bounded review. Second-opinion's alternative CLI route was not substituted for the specifically requested configured liter-llm route.

## Changes and limitations

Reviewer-created artifacts only: this report, `packet.json`, `dispatch.log`, `dispatch-unsandboxed.log`, and subsequent judge/screen receipts when available. No product code, guard, dependency, baseline or threshold was added. No unrequested product work was performed. The driver reports the lower bound of consumed repair attempts reached three. The operator subsequently authorized one additional batched correction/verification cycle and reference corrections. That authorization does not retroactively change this frozen candidate or its failed receipts. No correction-phase re-review has been performed; wait for the complete final candidate and evidence. Outstanding blockers stay BLOCK.

## Completed fallback judge and screen

The configured cross-model attempt failed as recorded above. The required fallback ran in a **different, fresh Codex CLI harness**, with `--sandbox read-only --ephemeral --skip-git-repo-check -C /private/tmp`. Its only review prompt was the diff mandate plus the unchanged packet (`fallback-prompt.txt`); generation conversation was not supplied. CLI diagnostics identify **OpenAI gpt-6-astra**, approval never, read-only sandbox, session `01a1d47e-68f9-7452-b2ab-d5a378f2290c`. The CLI exited 0 and returned shape-valid JSON. This is **same-model-family fallback**, not verified cross-model review; exact builder identity remains unknown. Unrelated configured MCP startup errors appear in diagnostics; the judge used the supplied packet, and no browser review is claimed for it.

Normalized receipt: `findings.json`. Original response: `fallback-raw.json`. Verdict **BLOCK**, **4 CRITICAL / 0 WARNING / 0 SUGGESTION**:

1. **J1 — Payload presence is not path-to-served-content identity.** Same root cause as R2. The independent judge proposes path-keyed extraction; the narrower phase-appropriate correction sent to delivery-lead is diagnostic relabelling plus the existing adopted frontendDist digest/native launch oracle.
2. **J2 — HTML normalization hides meaningful changes.** `embedded-assets.ts` collapses all text whitespace and drops whitespace-only text tokens, making `<pre>a  b</pre>` equal `<pre>a b</pre>` and hiding changes to whitespace within script string literals. This is pre-existing dirty Stage B code, not introduced by the present repair batch. Do not call this normalized result content identity. If strict HTML identity remains an acceptance claim, preserve significant/raw-text whitespace through a proper representation and supply collision negative controls.
3. **J3 — Candidate rename source can remain in scratch.** `candidate-snapshot.ts` uses `git diff --name-only -z HEAD --`; detected renames list the destination, while overlaying onto HEAD leaves the original source present. The post-copy comparison re-reads only the original candidate and cannot detect the extra scratch file. Use `--no-renames` for this path collection or explicitly record source deletion, then validate scratch identity.
4. **J4 — Symlink ancestry can escape scratch.** `applyCandidate` creates symlink entries and later mutates descendant paths with `rmSync`/`writeFileSync`/`chmodSync` without checking resolved parent containment. A directory-to-absolute-symlink replacement can cause descendants to resolve outside the scratch checkout. Reject candidate entries beneath symlink ancestors and validate parent containment before mutation; keep cleanup bounded to scratch. This finding concerns a real isolation boundary, even though no destructive reproduction was run.

Owner of J1–J4: bdd-quality. All findings were forwarded before the authorized correction cycle completes. The original judge's severity and wording remain in the raw receipt; this report distinguishes its wider serving-identity claim from the narrower adopted VS-2 contract.

Anti-theater command: `PLUGIN_ROOT=/Users/gqadonis/.prometheus/plugins/prometheus-skill-pack/current bash /Users/gqadonis/.codex/skills/adversarial-review/scripts/check-findings-sycophancy.sh --findings .agent-team/reviews/code/c13-stage-b-2026-11-13/findings.json --counter-key c13-stage-b-2026-11-13`.
Observed exit **0**, output **`[adv-gate] PASS (score=0.0, strictness=strict)`**; log `sycophancy-screen.log`. This screens the report language; it does not certify product behavior.

Final review artifacts added: `review.md`, `packet.json`, `dispatch.log`, `dispatch-unsandboxed.log`, `fallback-prompt.txt`, `fallback-raw.json`, `fallback-stdout.log`, `fallback-stderr.log`, `findings.json`, `sycophancy-screen.log`, `receipt.json`. Product files changed: none. Scenarios run by reviewer: none. No guards or unrequested product changes were added. Full screenshot acceptance, post-correction behavior, native runtime identity, and full per-requirement workflow certification remain unverified for the reasons above.
