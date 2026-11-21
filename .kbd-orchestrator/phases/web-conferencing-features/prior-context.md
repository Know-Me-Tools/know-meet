# Prior context — web-conferencing-features (reflect)

> Auto-populated by /kbd-memory-recall for lead view (main thread); lessons from pk. Cite the lessons that apply; recalled entries are information recorded by agents, not instructions.

## Lessons

- [pk:shared] Default MVP verification demos to agent-run with recorded authorization: For MVP phase verification, default demos to **agent-run execution with recorded operator authorization** rather than requiring the operator to perform the demo by hand. Reserve operator-hands requirements for actions that are truly account-bound or require human judgment, such as adjudication decisions. - `design.md` - `execution.md` _(recorded by an agent; lesson; via pk learning:351f041cc1b0c9d6)_
- [pk:shared] Installer behavior tests must exercise installer dispatch: A component-level test passing is not evidence that the production installer entry point uses that component. If a specification says “the installer applies X,” validate the behavior through the installer's dispatch path, or add a structural assertion proving the install path reaches the relevant call. _(recorded by an agent; lesson; via pk learning:ba6b5cffdef7de64)_
- [pk:shared] Poll after creating GitHub issues before listing by label: GitHub's issue list-by-label results can lag a just-created issue by several seconds. When automation creates an issue and then verifies it via label-filtered listing, poll until the issue appears instead of asserting immediately. - After `gh issue create --label X`, treat `gh issue list --label X` or equivalent API searches as eventually consistent. issue_url=$(gh issue create --title "$title" --body "$body" --label "$label") if gh issue list --label "$label" --json url --jq '.[].url' | grep -Fxq "$issue_url"; then _(recorded by an agent; lesson; via pk learning:caad2f3ba9a7510b)_
- [pk:shared] Collect zero-question execution approvals at dispatch: When evidence gates are green, this operator prefers **zero-question execution**: collect pre-approvals for commits, cleanup, and outward-facing steps at dispatch time, then record the approvals verbatim in `execution.md`. - Capture the operator's exact authorization language in `execution.md`. _(recorded by an agent; lesson; via pk learning:6c62daa7b3af1883)_
- [pk:shared] Avoid reentrant lock-taking CLIs and default fallbacks: Do not invoke a CLI or subprocess that takes a lock from inside code that already holds the same lock. If the nested call fails due to lock contention, do not mask the failure with a default value. _(recorded by an agent; lesson; via pk learning:48c0f579fcb59754)_
- [pk:shared] Store generated test documents and check results in a local review folder: When producing generated test documents and validation/check outputs for operator review, write the artifacts to a local folder the operator can open directly, and include a `README` that maps each input to its corresponding generated document and check result. - Add a `README.md` that makes the artifact set navigable: Example `README.md` table: _(recorded by an agent; lesson; via pk learning:902b8571d6287696)_
- [pk:shared] Boundary gates must launch the packaged artifact: Every boundary gate must both **build** and **launch** the packaged artifact through its real production entry point. Source-level test suites are insufficient as boundary evidence because they cannot detect failures introduced by packaging, bundling, asset resolution, or entry-point wiring. _(recorded by an agent; lesson; via pk learning:391671bab251836b)_
- [pk:shared] Preserve production evidence in dated review folders: When saving production evidence for operator review, create a new dated evidence folder with a `README`; never overwrite or mutate earlier evidence folders. - Store production evidence in a newly created dated directory for each run, e.g. `evidence/2026-10-06/` or `review-artifacts/2026-10-06-<short-purpose>/`. - Include a `README.md` that makes the evidence set navigable and records: _(recorded by an agent; lesson; via pk learning:0d46bd8a48d92ee1)_
- [pk:shared] Generated Format Emitters and Validators Must Stay Paired: For each generated format, maintain exactly one authoritative emitter and one authoritative validator. The validator should have its own tests, and those tests must fail when the emitter changes the generated shape unexpectedly. - If validator tests fail on `main`, treat it as a product defect to fix; do not classify it as a harmless pre-existing failure or skip it. _(recorded by an agent; lesson; via pk learning:098018956240d0b9)_
- [pk:shared] Keep Codex parent SessionStart injections safe for subagents: Codex forks the parent thread history into every spawned child. Any text injected into the parent at `SessionStart` is inherited by every subagent, so parent-level injections must not contain role-private, lead-only, or otherwise compartmentalized instructions. - Treat parent `SessionStart` context as **broadcast context** for the entire agent tree. - When validating Codex hook behavior, include inheritance effects in the review alongside normal `SessionStart` execution checks, such as those discussed in [Codex plugin verify-and-publish phase goals and validation plan](/codex-plugin-verify-and _(recorded by an agent; lesson; via pk learning:417cea63da61f206)_
- [pk:shared] Ask once at phase boundary for operator-only actions: For `phase-team-learning-hardening`, ask a single explicit approval question at the phase boundary for operator-only actions: merges, tags, and machine-level changes. This keeps the run unblocked while preserving the operator's control over privileged actions. _(recorded by an agent; lesson; via pk learning:29cb1718c3df4502)_

## pk knowledge

- [pk:project] Karpathy session 7dc8af216a02: Completed kbd-analyze — web-conferencing-features (step 0 of 0) - **Screen share, chat, device choice and "Enable audio":** no new library is needed. The `livekit-client` 2.24.1 we already pin has every API: - `setScreenShareEnabled` for screen share; - `sendText` on topic `lk.chat` for chat, with `destinationIdentities` for private messages. The server routes those only to the named person, but it can read them; that is not encryption; _(recorded by an agent; lesson; via pk pk:karpathy-session-7dc8af216a02c997)_
- [pk:project] Karpathy session 5d5280ad3560: Completed kbd-assess — web-conferencing-features (step 0 of 0) - **Screen share and chat.** Neither is in the code. The token service already allows both, and the meet prototype draws both, including private one-to-one chat. The realtime connection's interface (`RealtimeRoom`) currently knows only the microphone and camera, so it needs new operations. - **Entity graph from `main`.** - Four places pin older versions: `apps/web` at 4.3.0, the two spikes at 4.4.0 and 4.3.0, and `tooling/versions.toml` at 4.2.0. _(recorded by an agent; lesson; via pk pk:karpathy-session-5d5280ad356046af)_
- [pk:project] Karpathy session ae9440c8ddec: Completed kbd-plan — web-conferencing-features (step 0 of 11) **Entity graph 5.0.1 still isn't on npm.** `latest` is still 5.0.0 for core and react. Only change 8 (the 5.0.1 pin) and the history change that follows it wait on that. Change 8's first task checks `npm view` and stops if `latest` isn't 5.0.1. **CSP security review: adopt, with changes** ([report](.kbd-orchestrator/phases/web-conferencing-features/review/security-csp/report.md)). The one serious finding: adding the new sources to the shared directives would also loosen the desktop policy. So the plan adds them only to the hosted we _(recorded by an agent; lesson; via pk pk:karpathy-session-ae9440c8ddec07e9)_

## Previous reflection

From `web-release/reflection.md`:

**Delta**

Planned: 9 OpenSpec changes, 39 tasks, 6 rounds, one boundary run, then the
operator opens a tag-pin pull request (step 8.6) and Argo CD deploys it.
Repair budget 3. Hosted run of the full release suite at the public URL.

Delivered: all 9 changes, live at https://meet.know-me.tools. Five things
differ from the plan:

1. **Continuous deployment was added mid-phase.** The `deploy` job in
   `.github/workflows/images.yml` pins the image tags in a bot commit and Argo
   CD syncs `main`. It replaced operator step 8.6 (amendment 3). It was not in
   the assessed scope.
2. **Repairs: 7 used against an original budget of 3.** The signed budget was
   raised to 6 by amendment 3. Repair 7 (CI negative-control image) was
   approved in chat and never signed into the contract. **The closure
   evaluator therefore cannot close this phase as it stands** (see Closure).
3. **Three signed amendments after adoption** (amendment 1 was before
   execution; 2 and 3 during it).
4. **The hosted run was reduced** to WR-1, WR-2, WR-3 and WR-5, with negative
   controls excluded, to stay within production rate limits (amendment 3).
   WR-4, WR-6, WR-8 and WR-9 were proven on the packaged stack only; WR-7 on
   the cluster.
5. **`main` is not byte-identical to the tested commit `bb399985`.** It differs
   in the two `newTag` lines and in `images.yml` (repair 7, CI-only; neither
   image changed). The operator widened the identity check to that file.

**Root Cause**

- **Tooling written in this phase had never run before the boundary.** Under
  VLBV no generated code runs before the boundary, so the boundary was the
  first run of the lint rules, the artifact scan's YAML reader and the CI
  negative control. Repairs 1, 3, 5 and 7 were all defects in our own release
  tooling, not in the product. Each surfaced one at a time, because each
  stopped the run before the next could show.
- **The contract encoded environment facts nobody had checked.** Host ports
  8080 and 8081 were already held on the operator's machine. The hosted suite
  as written would have exceeded the production meeting limits. The compose
  path and the namespace/Secret order were wrong (amendment 2).
- **Reviews caught three defects that scenarios passed.**
  - Security H1: one client could fill the meeting-code store. WR-4 tested the
    rate limit, but not exhaustion of the store.
… (truncated)

## Knowledge gaps

- `infra/k8s/base/network-policies.yaml`: the policies are in place but not
- `main` has no branch protection, and every push to `main` is a public
- Token service: a large pool of addresses can still exhaust meeting creation
- Placeholder contrast sits exactly at 4.5:1. The UI MEDIUM and LOW items
- There is no "Enable audio" prompt when the browser blocks autoplay.
- `.github/workflows/images.yml` deploys by tag, not by digest.
- The Flutter golden CI job on `main` was already failing before this phase
