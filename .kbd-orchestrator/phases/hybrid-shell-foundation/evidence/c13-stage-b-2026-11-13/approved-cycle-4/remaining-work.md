# Observed remaining work — fourth cycle

This is a diagnosis, not authority for another repair cycle. The source is frozen
for the running gate. The approved limit is four; a fifth cycle needs operator
approval. No item below was implemented during this run.

## Confirmed from command output and saved browser traces

1. `tests/fidelity/src/capture/reference-correction-capture.ts:118`: TypeScript
   TS4111 requires `document.documentElement.dataset["navClass"]` instead of dot
   access. Production web build passes; workspace typecheck fails here.
2. `apps/web/src/app/frame/account-menu.tsx:54`: account accessible name excludes
   visible initials `AC`. Include the initials in the name. This affects signed-in
   screens across the audit matrix; it is one shared control.
3. `apps/web/src/presentation/dashboard/presentation/dashboard-parts.tsx:256`:
   visible `Copy link` differs from `Copy join link for …`. Use `Copy link for …`.
   This affects upcoming rows and four meeting-detail headers.
4. Focused skip link overlaps the brand at320/375/768/1024 and Start meeting at320,
   producing axe `target-size` failures. Preserve the finding pending a layout
   correction or demonstrated applicable exception; do not waive focused states.
5. Light-theme cyan text on cyan-soft measures4.36:1 where4.5:1 is required. This
   affects agent detail glyphs and recordings transcript/status badges. The design
   owner must select a conforming existing semantic pair or authorize a token
   correction; hiding text from assistive technology does not fix visual contrast.
6. Agent registration step4 `Fix in step` links inherit ember text on amber-soft,
   measuring4.08:1. Proposed token-based fix: inherit the Notice foreground while
   preserving the underline, subject to design-owner confirmation.
7. `recording-player.tsx:129`: chapter-button synthetic accessible names differ
   from rendered timestamp/title content. Prefer the visible children as the name.
8. `transcript-panel.tsx:174`: transcript-button synthetic names diverge from
   visible content and omit Agent badges. Prefer content-derived names; keep any
   additional instruction in a description rather than replacing the label.

Evidence: `02.log` and the frame/dashboard/agents/recordings failure trace ZIPs
under `suite/test-results/`. Owning roles inspected final axe
`result.violations`, excluding passing-node results. Frame trace example:
`59-trace.trace`, call `tpjg@2310`; twenty signed-in frame cells contain the four
account/copy-link violations. Exact selectors remain in the retained traces.

9. `room-controls.tsx:129/152/194`: visible `Start video`, `Record`, and `My agent`
   differ from camera/recording/private-agent accessible names. Make the names
   begin with the visible label while retaining useful context. Observed at1024
   and1440; camera affects both signed-in and guest room states.
10. Settings adds no new axe cause beyond the shared account label. Meeting-room
    Sources badges share the existing cyan4.36:1 contrast failure.

11. `tests/fidelity/src/a11y/scroll-regions-probe.ts:10` selects only the prototype
    `.table-wrap` class. The app renders `[data-slot="table-region"]`. Index trace
    snapshots at320/375 prove real named/focusable overflowing regions exist, but
    the probe collects none. Include the app slot selector; preserve the nonzero
    observation guard and all contrast/focus assertions.

12. Candidate checkpoint enumeration failed with `spawnSync git ENOBUFS` after
    the suite produced many untracked evidence paths. Exclusions currently apply
    after collecting Git output into the default execFileSync buffer. The capture
    layer should filter excluded roots before buffering/enumerating candidate
    paths; retain rename/delete/mode/symlink safeguards and real-Git controls.
    This failure did not change source: independent read-only reconstruction
    produced the exact original candidate digest with zero input differences.

## Stopped and unverified

The adopted contract requires a stop when a required safety check fails. The gate
was interrupted with SIGINT after observed required text-contrast failures. The
runner exited130;16 scenarios completed (5 passed,11 failed),108 have no completed
result. No completed Playwright JSON report was produced; command logs and failure
trace ZIPs are preserved. The suite's subprocess exit code was not observed.

Control/focus audit completion, its negative controls, motion, VS-1 screenshot
matrix, VS-2 desktop scenarios, VS-4, VS-5 and repository lint were not completed
in this attempt. Earlier evidence stays historical; no current pass is inferred.
No fifth repair cycle is authorized. Isolated review transmission remains pending
explicit operator approval after automatic approval review rejected it.
