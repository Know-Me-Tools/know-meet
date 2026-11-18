# wr01 reconciliation

Written by the lead on 2026-11-15 after tasks 1.1, 1.2, 1.3 and 1.5 reported.
Nothing in the worktree has been run: no test, build, typecheck, lint or
install. Every scenario verdict is NOT_EXERCISED.

## What wr01 produced (in the worktree, uncommitted)

- `features/wr-1-…` to `wr-9-…`: nine Gherkin features, one per scenario.
- `tests/release/`: package `@know-meet/release-tests`, six spec files, ten
  helper modules, a README, and `scan-contract.md` for the artifact scan.
- `tests/release/src/test-ids.ts` and `api-contract.ts`: the contracts wr03,
  wr05 and wr06 build to.
- `docs/design/web-release-acceptance.md`: 29 screen states, exact accessible
  names, copy, a 17-check review rubric and a 104-image screenshot matrix.
- `operator-prerequisites.md`: the pin list.

Static checks by the lead: no file over 500 lines, no `any` in
`tests/release`, file names kebab-case apart from `README.md`.

## Where the delivered acceptance differs from the adopted contract

The contract is bound at sha256 `9ccc9805…`. Changing it needs an
operator-signed amendment. These four items are the candidates. Until the
operator decides, the contract text stands and the specs are a reading of it.

1. **Boundary command and `productionEntry` strings.** The contract says
   `pnpm exec playwright test tests/release --project=…`. That cannot work:
   the root Playwright config re-exports the fidelity suite, whose projects
   are `web` and `cli`, and the root has no Playwright binary. The working
   form is
   `pnpm --filter @know-meet/release-tests exec playwright test --project=packaged`
   (and `hosted`). This is the lead's error in drafting the contract.
2. **WR-8 negative control.** The contract says lowering a control's fill
   contrast must make the axe run fail. axe-core does not test non-text
   contrast, so that control cannot fail as worded. The spec pairs axe with a
   fill-contrast probe (3:1 against the adjacent surface) and lowers the fill
   in the rendered page, not in a scratch build.
3. **WR-5 oracle, "Navigation shows only home, join and the meeting room".**
   DESIGN.md says navigation never appears in the join or room flows, so the
   hosted build has no primary navigation. The reading used: every rendered
   link goes to `/`, `/join` or `/meet`.
4. **WR-3 and WR-5 negative controls.** "The same spec must FAIL" is
   implemented as a test that runs the same check and asserts it reports the
   problem. Equivalent in effect; different in wording.

Also missing from the boundary packet, and needing the same amendment or a
wr07/wr09 task note: the run inputs the specs require (`KM_EVIDENCE_DIR`, the
CSP file path, the configured token lifetime and rate-limit values, the image
digests), and a step that serves the default non-hosted build for the WR-5
negative control.

## Cross-role requests raised by wr01 (routed to later tasks)

| Request | Owner | Lands in |
|---|---|---|
| Add the `tests/release` importer to `pnpm-lock.yaml` | build-platform | 7.4 |
| ls-lint ignores for `tests/release/reports` and `node_modules`; `Dockerfile` name | build-platform | 7.4 |
| `data-testid="km-not-found"` on the not-found route; name the CSP artifact path | client-shell | 6.1, 6.3 |
| Mirror `api-contract.ts` into the app's contracts | architect | 2.2 |
| One shared rate-limit bucket per client across both POST endpoints | livekit-platform | 3.3 |
| Unknown or malformed room code returns 404 | livekit-platform | 3.2 |
| Toggles expose `data-state="on"\|"off"`, no `aria-pressed`; action names | ui-engineer | 5.2, 5.3 |
| Decide musl target or a `cc` runtime base | livekit-platform | 7.2 |
| Settle whether `livekit-token` signs with `jsonwebtoken` default features off, by reading the source | livekit-platform | 3.2 |

## Open with the operator

- Design decisions O-1 to O-8 in `docs/design/web-release-acceptance.md`.
  O-1 (home copy) and O-2 (hero illustration) change factual content and need
  explicit approval; the others have safe defaults.
- Pins in root `versions.toml` (`operator-prerequisites.md`).
- Cluster login for task 1.6.
- The contract amendment above.

## Points for the security review at the boundary

- Room codes use the prototype format `km-xxx-xxx`, about 2.2 billion values.
  Whether that resists guessing, given the rate limit, is unreviewed.
- Requests with no `Origin` header are not covered by WR-4.
- The contract sets no upper bound on the token lifetime.
- Playwright traces contain the short-lived tokens the service returns. Raw
  traces must not be published with the evidence.

## Not determinable without running anything

Whether the specs typecheck and pass Biome; whether fake media devices work
with Playwright 1.65.0; whether the fidelity suite's generator ignores the new
features; whether the release claim's camera mute works, since WR-1 observes
only microphone mute from the other side.
