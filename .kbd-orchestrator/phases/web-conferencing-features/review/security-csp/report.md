# Security review: proposed web CSP widening (2026-11-18)

Reviewer: security-reviewer role, separate context from the builder, read-only. Nothing was installed or run.
Verdict: **ADOPT WITH CHANGES**. 0 critical, 1 high, 3 medium, 3 low.

- HIGH: putting the new sources in `BASE_DIRECTIVES` would also loosen the desktop policy, because `tauri-cli.ts:19-25`, the default dist meta tag (`vite.config.ts:17-24`) and the hosted header (`csp-artifact.ts:15-20`) share one builder. Add the sources only when `hosted === true`, and add a test that `tauri.conf.json` csp equals `buildContentSecurityPolicy({livekitUrl: undefined})`.
- MEDIUM: `worker-src blob:` is the only new path from a string to running code. It is only needed by the track-processors frame ticker. Try a library option, or `pnpm patch` it to a static same-origin worker, so the policy can be `worker-src 'self'`. If `blob:` stays, document why.
- MEDIUM: workers loaded from a URL take their policy from the HTTP header on their own `.js` response. Confirm the gateway header applies to `.js` and `.wasm`, and add that to the wr-3 check.
- MEDIUM: if the track-processors defaults (remote MediaPipe and model URLs) are not overridden, loading fails closed. Self-host them and prove it on the hosted build. Check whether the image background is fetched through `fetch(blob:)`, which connect-src covers.
- LOW: accept `'wasm-unsafe-eval'`, `media-src blob:` and `img-src blob:`. Serve `.wasm` as `application/wasm`. Trusted Types (report-only) is a follow-up.
- Consistency: the policy builder, both unit tests, the regenerated `security-headers.yaml` (`node tooling/release/src/render-gateway-headers.ts`, then `--check`) and the image must deploy together.
- Uncomfortable point: web and desktop policies now differ on purpose. Desktop use of PGlite or MediaPipe needs its own reviewed change.
- Limit: none of the three libraries is installed in this checkout, so their worker and fetch behaviour is unverified.
